import { allSettled, fork } from 'effector';
import { createMemoryHistory } from 'history';
import { createHistoryRouter, createRoute } from '../src';

const sleep = (t: number) => {
  return new Promise(r => {
    setTimeout(r, t);
  });
};

const foo = createRoute();
const bar = createRoute();
const first = createRoute();
const firstClone = createRoute();
const withParams = createRoute<{ postId: string }>();

const router = createHistoryRouter({
  routes: [
    { route: foo, path: '/foo' },
    { route: bar, path: '/bar' },
    { route: first, path: '/first' },
    { route: firstClone, path: '/first' },
    { route: withParams, path: '/posts/:postId' },
  ],
});

describe('Initialization', () => {
  it('Sets opened routes on initialization', async () => {
    const history = createMemoryHistory();
    history.push('/foo');
    const scope = fork();
    await allSettled(router.setHistory, {
      scope,
      params: history,
    });
    expect(scope.getState(foo.$isOpened)).toBe(true);
    expect(scope.getState(bar.$isOpened)).toBe(false);
    expect(scope.getState(first.$isOpened)).toBe(false);
    expect(scope.getState(firstClone.$isOpened)).toBe(false);
    expect(scope.getState(withParams.$isOpened)).toBe(false);
  });

  it('Puts params to the specific route.$params', async () => {
    const history = createMemoryHistory();
    history.push('/posts/123');
    const scope = fork();
    await allSettled(router.setHistory, {
      scope,
      params: history,
    });
    expect(scope.getState(foo.$params)).toEqual({});
    expect(scope.getState(bar.$params)).toEqual({});
    expect(scope.getState(first.$params)).toEqual({});
    expect(scope.getState(firstClone.$params)).toEqual({});
    expect(scope.getState(withParams.$params)).toEqual({ postId: '123' });
  });

  it('Puts query to the specific route.$query', async () => {
    const history = createMemoryHistory();
    history.push('/foo?bar=baz');
    const scope = fork();
    await allSettled(router.setHistory, {
      scope,
      params: history,
    });
    expect(scope.getState(foo.$query)).toEqual({ bar: 'baz' });
    expect(scope.getState(bar.$query)).toEqual({});
    expect(scope.getState(first.$query)).toEqual({});
    expect(scope.getState(firstClone.$query)).toEqual({});
    expect(scope.getState(withParams.$query)).toEqual({});
  });
});

describe('Lifecycle', () => {
  it('Triggers .opened() with params and query', async () => {
    const opened = jest.fn();
    withParams.opened.watch(opened);
    const history = createMemoryHistory();
    history.push('/');
    const scope = fork();
    await allSettled(router.setHistory, {
      scope,
      params: history,
    });
    history.push('/posts/foo?bar=baz');
    await sleep(100);
    expect(opened).toBeCalledWith({
      params: { postId: 'foo' },
      query: { bar: 'baz' },
    });
  });

  it('Ensures .opened() is called only once per open', async () => {
    const opened = jest.fn();
    withParams.opened.watch(opened);
    const history = createMemoryHistory();
    history.push('/foo');
    const scope = fork();
    await allSettled(router.setHistory, {
      scope,
      params: history,
    });
    history.push('/posts/foo');
    history.push('/posts/bar');
    await sleep(0);
    expect(opened).toBeCalledTimes(1);
  });

  it('Triggers .updated() when the same route is pushed', async () => {
    const updated = jest.fn();
    withParams.updated.watch(updated);
    const history = createMemoryHistory();
    history.push('/');
    const scope = fork();
    await allSettled(router.setHistory, {
      scope,
      params: history,
    });
    history.push('/posts/foo');
    history.push('/posts/bar?baz=1234');
    await sleep(0);
    expect(updated).toBeCalledTimes(1);
    expect(updated).toBeCalledWith({
      params: { postId: 'bar' },
      query: { baz: '1234' },
    });
  });

  it('Triggers .closed() when the route is closed', async () => {
    const closed = jest.fn();
    bar.closed.watch(closed);
    const history = createMemoryHistory();
    history.push('/bar');
    const scope = fork();
    await allSettled(router.setHistory, {
      scope,
      params: history,
    });
    history.push('/foo');
    await sleep(0);
    expect(closed).toBeCalledTimes(1);
  });
});

describe('Other checks', () => {
  it('Supports multiple routes opened at the same time', async () => {
    const history = createMemoryHistory();
    history.push('/first');
    const scope = fork();
    await allSettled(router.setHistory, {
      scope,
      params: history,
    });
    expect(scope.getState(first.$isOpened)).toBe(true);
    expect(scope.getState(firstClone.$isOpened)).toBe(true);
  });
});