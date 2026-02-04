export interface CodeEvaluationRequest {
  code: string;
  problemStatement: string;
  evaluationPrompt: string;
  testCases: Array<{ input: string; expectedOutput: string }>;
  starterCode?: string;
}

export interface CodeAnalysis {
  correctness: number;
  codeQuality: number;
  efficiency: number;
  style: number;
}

export interface TestResult {
  input: string;
  expected: string;
  passed: boolean;
  explanation: string;
}

export interface CodeEvaluationResult {
  score: number;
  passed: boolean;
  feedback: string;
  analysis: CodeAnalysis;
  suggestions: string[];
  testResults: TestResult[];
}
