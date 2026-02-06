import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CodeEvaluationRequest,
  CodeEvaluationResult,
  CodeAnalysis,
  TestResult,
} from './interfaces/code-evaluation.interface';

const EVALUATION_SYSTEM_PROMPT = `You are a Python code evaluator for a student challenge system.
Your task is to evaluate submitted Python code against the given problem requirements.

Evaluation Criteria (each scored 0-100):
1. Correctness: Does the code produce correct outputs for the test cases? Trace through the logic.
2. Code Quality: Is the code well-structured, readable, and maintainable?
3. Efficiency: Is the solution algorithmically efficient?
4. Style: Does the code follow Python conventions (PEP8)?

You must respond with valid JSON in this exact format:
{
  "correctness": <0-100>,
  "codeQuality": <0-100>,
  "efficiency": <0-100>,
  "style": <0-100>,
  "overallScore": <weighted average: correctness*0.5 + codeQuality*0.2 + efficiency*0.2 + style*0.1>,
  "feedback": "<constructive feedback for the student, 2-3 sentences>",
  "suggestions": ["<suggestion 1>", "<suggestion 2>"],
  "testResults": [
    {"input": "...", "expected": "...", "passed": true/false, "explanation": "..."}
  ]
}

Be encouraging but honest. Focus on helping students learn.
Do NOT execute the code - analyze it statically and trace through logic mentally.
IMPORTANT: Respond ONLY with the JSON object, no additional text.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private ollamaUrl: string;
  private ollamaModel: string;

  constructor(private configService: ConfigService) {
    this.ollamaUrl = this.configService.get<string>(
      'OLLAMA_URL',
      'http://localhost:11434',
    );
    this.ollamaModel = this.configService.get<string>(
      'OLLAMA_MODEL',
      'llama3.2',
    );

    this.logger.log(
      `Ollama configured at ${this.ollamaUrl} with model ${this.ollamaModel}`,
    );
  }

  async evaluateCode(
    request: CodeEvaluationRequest,
  ): Promise<CodeEvaluationResult> {
    // Validate and sanitize code
    const validationResult = this.validateCode(request.code);
    if (!validationResult.valid) {
      return this.createErrorResult(validationResult.errors.join('. '));
    }

    const sanitizedCode = this.sanitizeCode(request.code);

    try {
      const userPrompt = this.buildUserPrompt(sanitizedCode, request);

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: `${EVALUATION_SYSTEM_PROMPT}\n\n${userPrompt}`,
          stream: false,
          options: {
            temperature: 0.3,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = (await response.json()) as { response?: string };
      const responseText = data.response;

      if (!responseText) {
        throw new Error('Empty response from Ollama');
      }

      return this.parseAiResponse(responseText, request.testCases);
    } catch (error) {
      this.logger.error(`AI evaluation failed: ${error}`);
      return this.createErrorResult(
        'AI evaluation failed. Please ensure Ollama is running and try again.',
      );
    }
  }

  private buildUserPrompt(
    code: string,
    request: CodeEvaluationRequest,
  ): string {
    return `
## Problem Statement
${request.problemStatement}

## Custom Evaluation Instructions
${request.evaluationPrompt}

## Test Cases
${request.testCases.map((tc, i) => `Test ${i + 1}: Input: ${tc.input} → Expected Output: ${tc.expectedOutput}`).join('\n')}

## Submitted Code
\`\`\`python
${code}
\`\`\`

Please evaluate this code and respond with the JSON format specified.`;
  }

  private parseAiResponse(
    responseText: string,
    testCases: Array<{ input: string; expectedOutput: string }>,
  ): CodeEvaluationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const analysis: CodeAnalysis = {
        correctness: this.clampScore(parsed.correctness),
        codeQuality: this.clampScore(parsed.codeQuality),
        efficiency: this.clampScore(parsed.efficiency),
        style: this.clampScore(parsed.style),
      };

      const overallScore = Math.round(
        analysis.correctness * 0.5 +
          analysis.codeQuality * 0.2 +
          analysis.efficiency * 0.2 +
          analysis.style * 0.1,
      );

      const testResults: TestResult[] = (parsed.testResults || []).map(
        (tr: Record<string, unknown>, i: number) => ({
          input: String(tr.input || testCases[i]?.input || ''),
          expected: String(tr.expected || testCases[i]?.expectedOutput || ''),
          passed: Boolean(tr.passed),
          explanation: String(tr.explanation || ''),
        }),
      );

      return {
        score: overallScore,
        passed: overallScore >= 70,
        feedback: String(parsed.feedback || 'Code evaluation completed.'),
        analysis,
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.map(String)
          : [],
        testResults,
      };
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error}`);
      return this.createErrorResult('Failed to parse evaluation results.');
    }
  }

  private validateCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check code size
    if (code.length > 10240) {
      errors.push('Code exceeds maximum size of 10KB');
    }

    // Check for dangerous imports
    const dangerousImports = [
      'os',
      'subprocess',
      'sys',
      'socket',
      'requests',
      'urllib',
    ];
    for (const imp of dangerousImports) {
      if (new RegExp(`import\\s+${imp}|from\\s+${imp}`, 'i').test(code)) {
        errors.push(`Import of '${imp}' is not allowed for security reasons`);
      }
    }

    // Check for file operations
    if (/open\s*\(|file\s*\(/i.test(code)) {
      errors.push('File operations are not allowed');
    }

    // Check for exec/eval
    if (/\bexec\s*\(|\beval\s*\(/i.test(code)) {
      errors.push('exec() and eval() are not allowed');
    }

    return { valid: errors.length === 0, errors };
  }

  private sanitizeCode(code: string): string {
    // Remove potential prompt injection markers
    return code
      .replace(/```/g, '')
      .replace(/\[INST\]/gi, '')
      .replace(/\[\/INST\]/gi, '')
      .replace(/<<SYS>>/gi, '')
      .replace(/<\|.*?\|>/g, '')
      .slice(0, 10240);
  }

  private clampScore(value: unknown): number {
    const num = Number(value);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  }

  private createErrorResult(message: string): CodeEvaluationResult {
    return {
      score: 0,
      passed: false,
      feedback: message,
      analysis: { correctness: 0, codeQuality: 0, efficiency: 0, style: 0 },
      suggestions: [],
      testResults: [],
    };
  }
}
