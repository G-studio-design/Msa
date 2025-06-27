/**
 * @fileOverview Type definitions for the AI task suggestion flow.
 */
import { z } from 'zod';

export const SuggestTasksInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectStatus: z.string().describe('The current status or stage of the project.'),
});
export type SuggestTasksInput = z.infer<typeof SuggestTasksInputSchema>;

export const SuggestTasksOutputSchema = z.object({
  tasks: z
    .array(z.string().describe('A single, actionable task suggestion.'))
    .describe('A list of suggested tasks.'),
});
export type SuggestTasksOutput = z.infer<typeof SuggestTasksOutputSchema>;
