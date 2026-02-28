import { match } from 'path-to-regexp';
import { RoutedFragmentBase } from './routed-fragment';

/**
 * Parsed fragment with extracted parameters and matched route.
 */
export interface ParsedRoute<T extends RoutedFragmentBase = RoutedFragmentBase> {
  params: Record<string, unknown>;
  route: T;
  fragment: string;
}

/**
 * Parses URL fragment into structured routes with parameters.
 * Supports multiple fragments separated by '#' and query parameters.
 *
 * @param fragment - Raw URL fragment (e.g., "details/123?edit=true#confirm")
 * @param registeredRoutes - Array of route configurations to match against
 * @returns Array of parsed routes with extracted parameters
 *
 * @example
 * ```typescript
 * const routes = [
 *   { type: 'modal', path: 'details/:id' }
 * ];
 * const parsed = parseFragment('details/123?edit=true', routes);
 * // [{ params: { id: '123', edit: true }, route: {...}, fragment: 'details/123?edit=true' }]
 * ```
 */
export function parseFragment<T extends RoutedFragmentBase>(
  fragment: string,
  registeredRoutes: T[],
): ParsedRoute<T>[] {
  // Normalize routes: expand arrays into individual route entries
  const normalizedRoutes = registeredRoutes.flatMap((route) => {
    if (Array.isArray(route.path)) {
      return route.path.map((p) => ({ ...route, path: p }));
    }
    return [route];
  });

  const routeGroups = fragment.split('#');

  return routeGroups
    .map((routeGroup) => {
      const [routePath, queryParamsString] = routeGroup.split('?');
      const parsedParams: Record<string, unknown> = {};

      const registeredRoute = normalizedRoutes.find((route) => {
        const matcher = match(route.path, { decode: decodeURIComponent });
        const matchResult = matcher(routePath);
        return !!matchResult;
      });

      if (registeredRoute) {
        const matcher = match(registeredRoute.path, { decode: decodeURIComponent });
        const matchResult = matcher(routePath);

        if (matchResult) {
          Object.assign(parsedParams, matchResult.params);
        }

        if (queryParamsString) {
          const queryParams = new URLSearchParams(queryParamsString);
          queryParams.forEach((value, key) => {
            let parsedValue: unknown;

            try {
              parsedValue = JSON.parse(value);
            } catch {
              parsedValue = value;
            }

            parsedParams[key] = parsedValue;
          });
        }

        return { fragment: routeGroup, params: parsedParams, route: registeredRoute };
      }

      return null;
    })
    .filter((route) => route !== null);
}
