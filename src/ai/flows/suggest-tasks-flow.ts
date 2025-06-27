'use server';
/**
 * @fileOverview An AI flow to suggest tasks for a project stage.
 *
 * - suggestTasks - A function that suggests actionable tasks based on the project's title and status.
 * - SuggestTasksInput - The input type for the suggestTasks function.
 * - SuggestTasksOutput - The return type for the suggestTasks function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'zod';

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

const suggestTasksPrompt = ai.definePrompt({
  name: 'suggestTasksPrompt',
  input: {schema: SuggestTasksInputSchema},
  output: {schema: SuggestTasksOutputSchema},
  prompt: `You are an expert project manager in an architectural firm. For a project titled '{{projectTitle}}' which is currently in the '{{projectStatus}}' stage, please generate a concise list of 3 to 5 actionable tasks.

The tasks should be clear, practical, and relevant to this specific project phase. For example, if the status is "Pending Architect Files", tasks could include "Draft initial floor plans", "Create 3D model", "Prepare elevation drawings".

Provide the output as a JSON object with a 'tasks' array.`,
});

const suggestTasksFlow = ai.defineFlow(
  {
    name: 'suggestTasksFlow',
    inputSchema: SuggestTasksInputSchema,
    outputSchema: SuggestTasksOutputSchema,
  },
  async (input) => {
    console.log('[suggestTasksFlow] received input:', input);
    const {output} = await suggestTasksPrompt(input);
    return output!;
  }
);

export async function suggestTasks(input: SuggestTasksInput): Promise<SuggestTasksOutput> {
    return suggestTasksFlow(input);
}
