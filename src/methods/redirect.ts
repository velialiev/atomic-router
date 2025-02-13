import {
  Clock,
  createEvent,
  createStore,
  Event,
  is,
  sample,
  Store,
} from 'effector';
import { EmptyObject, RouteInstance, RouteParams, RouteQuery } from '../types';

type RedirectParams<T, Params extends RouteParams> = Params extends EmptyObject
  ? {
      clock?: Clock<T>;
      route: RouteInstance<Params>;
      query?: ((clock: T) => RouteQuery) | Store<RouteQuery> | RouteQuery;
    }
  :
      | {
          clock?: Clock<T>;
          route: RouteInstance<Params>;
          params: ((clock: T) => Params) | Store<Params> | Params;
          query?: ((clock: T) => RouteQuery) | Store<RouteQuery> | RouteQuery;
        }
      | {
          clock?: Clock<{
            params: Params;
            query?: RouteQuery;
          }>;
          route: RouteInstance<Params>;
          params?: ((clock: T) => Params) | Store<Params> | Params;
          query?: ((clock: T) => RouteQuery) | Store<RouteQuery> | RouteQuery;
        };

/** Opens passed `route` upon `clock` trigger */
export function redirect<T, Params extends RouteParams>(
  options: RedirectParams<T, Params>
) {
  const clock = options.clock
    ? sample({ clock: options.clock as Event<T> })
    : createEvent<T>();

  let params = toStore(options.params || {});
  let query = toStore(options.query || {});

  sample({
    clock: clock,
    source: { params, query },
    fn: ({ params, query }, clock) => ({
      params: typeof params === 'function' ? params(clock) : params,
      query: typeof query === 'function' ? query(clock) : query,
    }),
    target: options.route.navigate,
  });
  return clock;
}

function toStore<T>(payload: T | Store<T>): Store<T> {
  return is.store(payload) ? payload : createStore(payload as T);
}
