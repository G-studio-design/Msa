'use server';
/**
 * @fileOverview An AI flow to suggest tasks for a project stage.
 *
 * - suggestTasks - A function that suggests actionable tasks based on the project's title and status.
 */

import {ai} from '@/ai/ai-instance';
import {
  SuggestTasksInputSchema,
  SuggestTasksOutputSchema,
  type SuggestTasksInput,
  type SuggestTasksOutput,
} from '@/ai/types/suggest-tasks-types'; // Import from the new types file

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

// This is now the ONLY export from this file.
export async function suggestTasks(input: SuggestTasksInput): Promise<SuggestTasksOutput> {
    return suggestTasksFlow(input);
}
