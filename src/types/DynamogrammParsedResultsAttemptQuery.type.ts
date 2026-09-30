export type DynamogrammParsedResultsAttemptQuery = {
  command_spec_history_id: number;
  dynamogramm_parsed_results_id: number | undefined;
  status: 'success' | 'error';
  error_description: string | undefined;
  created_at: Date;
};
