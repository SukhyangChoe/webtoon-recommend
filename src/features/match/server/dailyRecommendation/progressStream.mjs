import { DAILY_PROGRESS_MESSAGES } from '../../config/dailyPicksPresentation.mjs';

/** Await the existing selection task; only its public milestones are streamed. */
export function dailyPicksProgressStream(run, onError) {
  const encoder = new TextEncoder();
  let closed = false;
  return new ReadableStream({
    async start(controller) {
      const send = event => { if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)); };
      try {
        send({ type: 'progress', stage: 'loading' });
        const data = await run(stage => {
          if (Object.hasOwn(DAILY_PROGRESS_MESSAGES, stage)) send({ type: 'progress', stage });
        });
        send({ type: 'result', data });
      } catch (error) {
        const failure = onError(error);
        send({ type: 'error', error: failure.error, status: failure.status });
      } finally {
        if (!closed) { closed = true; controller.close(); }
      }
    },
    cancel() { closed = true; },
  });
}
