export enum SubmissionStatus {
  PENDING = 'PENDING',
  ONGOING = 'ONGOING', // Being evaluated by AI
  COMPLETED = 'COMPLETED', // Passed evaluation
  FAILED = 'FAILED', // Failed evaluation
  ERROR = 'ERROR', // Error during evaluation
}
