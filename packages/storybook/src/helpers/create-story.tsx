// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createStory(meta: Record<string, any>) {
  return {
    ...meta,
    Story: {},
  };
}
