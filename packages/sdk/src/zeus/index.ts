/* eslint-disable */

import { AllTypesProps, ReturnTypes, Ops } from './const.js';
import fetch, { Response } from 'node-fetch';
import WebSocket from 'ws';
export const HOST = "https://mailik.aexol.work/graphql"


export const HEADERS = {}
export const apiSubscription = (options: chainOptions) => (query: string) => {
  try {
    const queryString = options[0] + '?query=' + encodeURIComponent(query);
    const wsString = queryString.replace('http', 'ws');
    const host = (options.length > 1 && options[1]?.websocket?.[0]) || wsString;
    const webSocketOptions = options[1]?.websocket || [host];
    const ws = new WebSocket(...webSocketOptions);
    return {
      ws,
      on: (e: (args: any) => void) => {
        ws.onmessage = (event: any) => {
          if (event.data) {
            const parsed = JSON.parse(event.data);
            const data = parsed.data;
            return e(data);
          }
        };
      },
      off: (e: (args: any) => void) => {
        ws.onclose = e;
      },
      error: (e: (args: any) => void) => {
        ws.onerror = e;
      },
      open: (e: () => void) => {
        ws.onopen = e;
      },
    };
  } catch {
    throw new Error('No websockets implemented');
  }
};
const handleFetchResponse = (response: Response): Promise<GraphQLResponse> => {
  if (!response.ok) {
    return new Promise((_, reject) => {
      response
        .text()
        .then((text) => {
          try {
            reject(JSON.parse(text));
          } catch (err) {
            reject(text);
          }
        })
        .catch(reject);
    });
  }
  return response.json() as Promise<GraphQLResponse>;
};

export const apiFetch =
  (options: fetchOptions) =>
  (query: string, variables: Record<string, unknown> = {}) => {
    const fetchOptions = options[1] || {};
    if (fetchOptions.method && fetchOptions.method === 'GET') {
      return fetch(`${options[0]}?query=${encodeURIComponent(query)}`, fetchOptions)
        .then(handleFetchResponse)
        .then((response: GraphQLResponse) => {
          if (response.errors) {
            throw new GraphQLError(response);
          }
          return response.data;
        });
    }
    return fetch(`${options[0]}`, {
      body: JSON.stringify({ query, variables }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      ...fetchOptions,
    })
      .then(handleFetchResponse)
      .then((response: GraphQLResponse) => {
        if (response.errors) {
          throw new GraphQLError(response);
        }
        return response.data;
      });
  };

export const InternalsBuildQuery = ({
  ops,
  props,
  returns,
  options,
  scalars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  options?: OperationOptions;
  scalars?: ScalarDefinition;
}) => {
  const ibb = (
    k: string,
    o: InputValueType | VType,
    p = '',
    root = true,
    vars: Array<{ name: string; graphQLType: string }> = [],
  ): string => {
    const keyForPath = purifyGraphQLKey(k);
    const newPath = [p, keyForPath].join(SEPARATOR);
    if (!o) {
      return '';
    }
    if (typeof o === 'boolean' || typeof o === 'number') {
      return k;
    }
    if (typeof o === 'string') {
      return `${k} ${o}`;
    }
    if (Array.isArray(o)) {
      const args = InternalArgsBuilt({
        props,
        returns,
        ops,
        scalars,
        vars,
      })(o[0], newPath);
      return `${ibb(args ? `${k}(${args})` : k, o[1], p, false, vars)}`;
    }
    if (k === '__alias') {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (typeof objectUnderAlias !== 'object' || Array.isArray(objectUnderAlias)) {
            throw new Error(
              'Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}',
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(`${alias}:${operationName}`, operation, p, false, vars);
        })
        .join('\n');
    }
    const hasOperationName = root && options?.operationName ? ' ' + options.operationName : '';
    const keyForDirectives = o.__directives ?? '';
    const query = `{${Object.entries(o)
      .filter(([k]) => k !== '__directives')
      .map((e) => ibb(...e, [p, `field<>${keyForPath}`].join(SEPARATOR), false, vars))
      .join('\n')}}`;
    if (!root) {
      return `${k} ${keyForDirectives}${hasOperationName} ${query}`;
    }
    const varsString = vars.map((v) => `${v.name}: ${v.graphQLType}`).join(', ');
    return `${k} ${keyForDirectives}${hasOperationName}${varsString ? `(${varsString})` : ''} ${query}`;
  };
  return ibb;
};

export const Thunder =
  (fn: FetchFunction) =>
  <O extends keyof typeof Ops, SCLR extends ScalarDefinition, R extends keyof ValueTypes = GenericOperation<O>>(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<SCLR>,
  ) =>
  <Z extends ValueTypes[R]>(o: Z | ValueTypes[R], ops?: OperationOptions & { variables?: Record<string, unknown> }) =>
    fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: graphqlOptions?.scalars,
      }),
      ops?.variables,
    ).then((data) => {
      if (graphqlOptions?.scalars) {
        return decodeScalarsInResponse({
          response: data,
          initialOp: operation,
          initialZeusQuery: o as VType,
          returns: ReturnTypes,
          scalars: graphqlOptions.scalars,
          ops: Ops,
        });
      }
      return data;
    }) as Promise<InputType<GraphQLTypes[R], Z, SCLR>>;

export const Chain = (...options: chainOptions) => Thunder(apiFetch(options));

export const SubscriptionThunder =
  (fn: SubscriptionFunction) =>
  <O extends keyof typeof Ops, SCLR extends ScalarDefinition, R extends keyof ValueTypes = GenericOperation<O>>(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<SCLR>,
  ) =>
  <Z extends ValueTypes[R]>(o: Z | ValueTypes[R], ops?: OperationOptions & { variables?: ExtractVariables<Z> }) => {
    const returnedFunction = fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: graphqlOptions?.scalars,
      }),
    ) as SubscriptionToGraphQL<Z, GraphQLTypes[R], SCLR>;
    if (returnedFunction?.on && graphqlOptions?.scalars) {
      const wrapped = returnedFunction.on;
      returnedFunction.on = (fnToCall: (args: InputType<GraphQLTypes[R], Z, SCLR>) => void) =>
        wrapped((data: InputType<GraphQLTypes[R], Z, SCLR>) => {
          if (graphqlOptions?.scalars) {
            return fnToCall(
              decodeScalarsInResponse({
                response: data,
                initialOp: operation,
                initialZeusQuery: o as VType,
                returns: ReturnTypes,
                scalars: graphqlOptions.scalars,
                ops: Ops,
              }),
            );
          }
          return fnToCall(data);
        });
    }
    return returnedFunction;
  };

export const Subscription = (...options: chainOptions) => SubscriptionThunder(apiSubscription(options));
export const Zeus = <
  Z extends ValueTypes[R],
  O extends keyof typeof Ops,
  R extends keyof ValueTypes = GenericOperation<O>,
>(
  operation: O,
  o: Z | ValueTypes[R],
  ops?: {
    operationOptions?: OperationOptions;
    scalars?: ScalarDefinition;
  },
) =>
  InternalsBuildQuery({
    props: AllTypesProps,
    returns: ReturnTypes,
    ops: Ops,
    options: ops?.operationOptions,
    scalars: ops?.scalars,
  })(operation, o as VType);

export const ZeusSelect = <T>() => ((t: unknown) => t) as SelectionFunction<T>;

export const Selector = <T extends keyof ValueTypes>(key: T) => key && ZeusSelect<ValueTypes[T]>();

export const TypeFromSelector = <T extends keyof ValueTypes>(key: T) => key && ZeusSelect<ValueTypes[T]>();
export const Gql = Chain(HOST, {
  headers: {
    'Content-Type': 'application/json',
    ...HEADERS,
  },
});

export const ZeusScalars = ZeusSelect<ScalarCoders>();

export const decodeScalarsInResponse = <O extends Operations>({
  response,
  scalars,
  returns,
  ops,
  initialZeusQuery,
  initialOp,
}: {
  ops: O;
  response: any;
  returns: ReturnTypesType;
  scalars?: Record<string, ScalarResolver | undefined>;
  initialOp: keyof O;
  initialZeusQuery: InputValueType | VType;
}) => {
  if (!scalars) {
    return response;
  }
  const builder = PrepareScalarPaths({
    ops,
    returns,
  });

  const scalarPaths = builder(initialOp as string, ops[initialOp], initialZeusQuery);
  if (scalarPaths) {
    const r = traverseResponse({ scalarPaths, resolvers: scalars })(initialOp as string, response, [ops[initialOp]]);
    return r;
  }
  return response;
};

export const traverseResponse = ({
  resolvers,
  scalarPaths,
}: {
  scalarPaths: { [x: string]: `scalar.${string}` };
  resolvers: {
    [x: string]: ScalarResolver | undefined;
  };
}) => {
  const ibb = (k: string, o: InputValueType | VType, p: string[] = []): unknown => {
    if (Array.isArray(o)) {
      return o.map((eachO) => ibb(k, eachO, p));
    }
    if (o == null) {
      return o;
    }
    const scalarPathString = p.join(SEPARATOR);
    const currentScalarString = scalarPaths[scalarPathString];
    if (currentScalarString) {
      const currentDecoder = resolvers[currentScalarString.split('.')[1]]?.decode;
      if (currentDecoder) {
        return currentDecoder(o);
      }
    }
    if (typeof o === 'boolean' || typeof o === 'number' || typeof o === 'string' || !o) {
      return o;
    }
    const entries = Object.entries(o).map(([k, v]) => [k, ibb(k, v, [...p, purifyGraphQLKey(k)])] as const);
    const objectFromEntries = entries.reduce<Record<string, unknown>>((a, [k, v]) => {
      a[k] = v;
      return a;
    }, {});
    return objectFromEntries;
  };
  return ibb;
};

export type AllTypesPropsType = {
  [x: string]:
    | undefined
    | `scalar.${string}`
    | 'enum'
    | {
        [x: string]:
          | undefined
          | string
          | {
              [x: string]: string | undefined;
            };
      };
};

export type ReturnTypesType = {
  [x: string]:
    | {
        [x: string]: string | undefined;
      }
    | `scalar.${string}`
    | undefined;
};
export type InputValueType = {
  [x: string]: undefined | boolean | string | number | [any, undefined | boolean | InputValueType] | InputValueType;
};
export type VType =
  | undefined
  | boolean
  | string
  | number
  | [any, undefined | boolean | InputValueType]
  | InputValueType;

export type PlainType = boolean | number | string | null | undefined;
export type ZeusArgsType =
  | PlainType
  | {
      [x: string]: ZeusArgsType;
    }
  | Array<ZeusArgsType>;

export type Operations = Record<string, string>;

export type VariableDefinition = {
  [x: string]: unknown;
};

export const SEPARATOR = '|';

export type fetchOptions = Parameters<typeof fetch>;
type websocketOptions = typeof WebSocket extends new (...args: infer R) => WebSocket ? R : never;
export type chainOptions = [fetchOptions[0], fetchOptions[1] & { websocket?: websocketOptions }] | [fetchOptions[0]];
export type FetchFunction = (query: string, variables?: Record<string, unknown>) => Promise<any>;
export type SubscriptionFunction = (query: string) => any;
type NotUndefined<T> = T extends undefined ? never : T;
export type ResolverType<F> = NotUndefined<F extends [infer ARGS, any] ? ARGS : undefined>;

export type OperationOptions = {
  operationName?: string;
};

export type ScalarCoder = Record<string, (s: unknown) => string>;

export interface GraphQLResponse {
  data?: Record<string, any>;
  errors?: Array<{
    message: string;
  }>;
}
export class GraphQLError extends Error {
  constructor(public response: GraphQLResponse) {
    super('');
    console.error(response);
  }
  toString() {
    return 'GraphQL Response Error';
  }
}
export type GenericOperation<O> = O extends keyof typeof Ops ? typeof Ops[O] : never;
export type ThunderGraphQLOptions<SCLR extends ScalarDefinition> = {
  scalars?: SCLR | ScalarCoders;
};

const ExtractScalar = (mappedParts: string[], returns: ReturnTypesType): `scalar.${string}` | undefined => {
  if (mappedParts.length === 0) {
    return;
  }
  const oKey = mappedParts[0];
  const returnP1 = returns[oKey];
  if (typeof returnP1 === 'object') {
    const returnP2 = returnP1[mappedParts[1]];
    if (returnP2) {
      return ExtractScalar([returnP2, ...mappedParts.slice(2)], returns);
    }
    return undefined;
  }
  return returnP1 as `scalar.${string}` | undefined;
};

export const PrepareScalarPaths = ({ ops, returns }: { returns: ReturnTypesType; ops: Operations }) => {
  const ibb = (
    k: string,
    originalKey: string,
    o: InputValueType | VType,
    p: string[] = [],
    pOriginals: string[] = [],
    root = true,
  ): { [x: string]: `scalar.${string}` } | undefined => {
    if (!o) {
      return;
    }
    if (typeof o === 'boolean' || typeof o === 'number' || typeof o === 'string') {
      const extractionArray = [...pOriginals, originalKey];
      const isScalar = ExtractScalar(extractionArray, returns);
      if (isScalar?.startsWith('scalar')) {
        const partOfTree = {
          [[...p, k].join(SEPARATOR)]: isScalar,
        };
        return partOfTree;
      }
      return {};
    }
    if (Array.isArray(o)) {
      return ibb(k, k, o[1], p, pOriginals, false);
    }
    if (k === '__alias') {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (typeof objectUnderAlias !== 'object' || Array.isArray(objectUnderAlias)) {
            throw new Error(
              'Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}',
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(alias, operationName, operation, p, pOriginals, false);
        })
        .reduce((a, b) => ({
          ...a,
          ...b,
        }));
    }
    const keyName = root ? ops[k] : k;
    return Object.entries(o)
      .filter(([k]) => k !== '__directives')
      .map(([k, v]) => {
        // Inline fragments shouldn't be added to the path as they aren't a field
        const isInlineFragment = originalKey.match(/^...\s*on/) != null;
        return ibb(
          k,
          k,
          v,
          isInlineFragment ? p : [...p, purifyGraphQLKey(keyName || k)],
          isInlineFragment ? pOriginals : [...pOriginals, purifyGraphQLKey(originalKey)],
          false,
        );
      })
      .reduce((a, b) => ({
        ...a,
        ...b,
      }));
  };
  return ibb;
};

export const purifyGraphQLKey = (k: string) => k.replace(/\([^)]*\)/g, '').replace(/^[^:]*\:/g, '');

const mapPart = (p: string) => {
  const [isArg, isField] = p.split('<>');
  if (isField) {
    return {
      v: isField,
      __type: 'field',
    } as const;
  }
  return {
    v: isArg,
    __type: 'arg',
  } as const;
};

type Part = ReturnType<typeof mapPart>;

export const ResolveFromPath = (props: AllTypesPropsType, returns: ReturnTypesType, ops: Operations) => {
  const ResolvePropsType = (mappedParts: Part[]) => {
    const oKey = ops[mappedParts[0].v];
    const propsP1 = oKey ? props[oKey] : props[mappedParts[0].v];
    if (propsP1 === 'enum' && mappedParts.length === 1) {
      return 'enum';
    }
    if (typeof propsP1 === 'string' && propsP1.startsWith('scalar.') && mappedParts.length === 1) {
      return propsP1;
    }
    if (typeof propsP1 === 'object') {
      if (mappedParts.length < 2) {
        return 'not';
      }
      const propsP2 = propsP1[mappedParts[1].v];
      if (typeof propsP2 === 'string') {
        return rpp(
          `${propsP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`,
        );
      }
      if (typeof propsP2 === 'object') {
        if (mappedParts.length < 3) {
          return 'not';
        }
        const propsP3 = propsP2[mappedParts[2].v];
        if (propsP3 && mappedParts[2].__type === 'arg') {
          return rpp(
            `${propsP3}${SEPARATOR}${mappedParts
              .slice(3)
              .map((mp) => mp.v)
              .join(SEPARATOR)}`,
          );
        }
      }
    }
  };
  const ResolveReturnType = (mappedParts: Part[]) => {
    if (mappedParts.length === 0) {
      return 'not';
    }
    const oKey = ops[mappedParts[0].v];
    const returnP1 = oKey ? returns[oKey] : returns[mappedParts[0].v];
    if (typeof returnP1 === 'object') {
      if (mappedParts.length < 2) return 'not';
      const returnP2 = returnP1[mappedParts[1].v];
      if (returnP2) {
        return rpp(
          `${returnP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`,
        );
      }
    }
  };
  const rpp = (path: string): 'enum' | 'not' | `scalar.${string}` => {
    const parts = path.split(SEPARATOR).filter((l) => l.length > 0);
    const mappedParts = parts.map(mapPart);
    const propsP1 = ResolvePropsType(mappedParts);
    if (propsP1) {
      return propsP1;
    }
    const returnP1 = ResolveReturnType(mappedParts);
    if (returnP1) {
      return returnP1;
    }
    return 'not';
  };
  return rpp;
};

export const InternalArgsBuilt = ({
  props,
  ops,
  returns,
  scalars,
  vars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  scalars?: ScalarDefinition;
  vars: Array<{ name: string; graphQLType: string }>;
}) => {
  const arb = (a: ZeusArgsType, p = '', root = true): string => {
    if (typeof a === 'string') {
      if (a.startsWith(START_VAR_NAME)) {
        const [varName, graphQLType] = a.replace(START_VAR_NAME, '$').split(GRAPHQL_TYPE_SEPARATOR);
        const v = vars.find((v) => v.name === varName);
        if (!v) {
          vars.push({
            name: varName,
            graphQLType,
          });
        } else {
          if (v.graphQLType !== graphQLType) {
            throw new Error(
              `Invalid variable exists with two different GraphQL Types, "${v.graphQLType}" and ${graphQLType}`,
            );
          }
        }
        return varName;
      }
    }
    const checkType = ResolveFromPath(props, returns, ops)(p);
    if (checkType.startsWith('scalar.')) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, ...splittedScalar] = checkType.split('.');
      const scalarKey = splittedScalar.join('.');
      return (scalars?.[scalarKey]?.encode?.(a) as string) || JSON.stringify(a);
    }
    if (Array.isArray(a)) {
      return `[${a.map((arr) => arb(arr, p, false)).join(', ')}]`;
    }
    if (typeof a === 'string') {
      if (checkType === 'enum') {
        return a;
      }
      return `${JSON.stringify(a)}`;
    }
    if (typeof a === 'object') {
      if (a === null) {
        return `null`;
      }
      const returnedObjectString = Object.entries(a)
        .filter(([, v]) => typeof v !== 'undefined')
        .map(([k, v]) => `${k}: ${arb(v, [p, k].join(SEPARATOR), false)}`)
        .join(',\n');
      if (!root) {
        return `{${returnedObjectString}}`;
      }
      return returnedObjectString;
    }
    return `${a}`;
  };
  return arb;
};

export const resolverFor = <X, T extends keyof ResolverInputTypes, Z extends keyof ResolverInputTypes[T]>(
  type: T,
  field: Z,
  fn: (
    args: Required<ResolverInputTypes[T]>[Z] extends [infer Input, any] ? Input : any,
    source: any,
  ) => Z extends keyof ModelTypes[T] ? ModelTypes[T][Z] | Promise<ModelTypes[T][Z]> | X : never,
) => fn as (args?: any, source?: any) => ReturnType<typeof fn>;

export type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;
export type ZeusState<T extends (...args: any[]) => Promise<any>> = NonNullable<UnwrapPromise<ReturnType<T>>>;
export type ZeusHook<
  T extends (...args: any[]) => Record<string, (...args: any[]) => Promise<any>>,
  N extends keyof ReturnType<T>,
> = ZeusState<ReturnType<T>[N]>;

export type WithTypeNameValue<T> = T & {
  __typename?: boolean;
  __directives?: string;
};
export type AliasType<T> = WithTypeNameValue<T> & {
  __alias?: Record<string, WithTypeNameValue<T>>;
};
type DeepAnify<T> = {
  [P in keyof T]?: any;
};
type IsPayLoad<T> = T extends [any, infer PayLoad] ? PayLoad : T;
export type ScalarDefinition = Record<string, ScalarResolver>;

type IsScalar<S, SCLR extends ScalarDefinition> = S extends 'scalar' & { name: infer T }
  ? T extends keyof SCLR
    ? SCLR[T]['decode'] extends (s: unknown) => unknown
      ? ReturnType<SCLR[T]['decode']>
      : unknown
    : unknown
  : S;
type IsArray<T, U, SCLR extends ScalarDefinition> = T extends Array<infer R>
  ? InputType<R, U, SCLR>[]
  : InputType<T, U, SCLR>;
type FlattenArray<T> = T extends Array<infer R> ? R : T;
type BaseZeusResolver = boolean | 1 | string | Variable<any, string>;

type IsInterfaced<SRC extends DeepAnify<DST>, DST, SCLR extends ScalarDefinition> = FlattenArray<SRC> extends
  | ZEUS_INTERFACES
  | ZEUS_UNIONS
  ? {
      [P in keyof SRC]: SRC[P] extends '__union' & infer R
        ? P extends keyof DST
          ? IsArray<R, '__typename' extends keyof DST ? DST[P] & { __typename: true } : DST[P], SCLR>
          : IsArray<R, '__typename' extends keyof DST ? { __typename: true } : never, SCLR>
        : never;
    }[keyof SRC] & {
      [P in keyof Omit<
        Pick<
          SRC,
          {
            [P in keyof DST]: SRC[P] extends '__union' & infer R ? never : P;
          }[keyof DST]
        >,
        '__typename'
      >]: IsPayLoad<DST[P]> extends BaseZeusResolver ? IsScalar<SRC[P], SCLR> : IsArray<SRC[P], DST[P], SCLR>;
    }
  : {
      [P in keyof Pick<SRC, keyof DST>]: IsPayLoad<DST[P]> extends BaseZeusResolver
        ? IsScalar<SRC[P], SCLR>
        : IsArray<SRC[P], DST[P], SCLR>;
    };

export type MapType<SRC, DST, SCLR extends ScalarDefinition> = SRC extends DeepAnify<DST>
  ? IsInterfaced<SRC, DST, SCLR>
  : never;
// eslint-disable-next-line @typescript-eslint/ban-types
export type InputType<SRC, DST, SCLR extends ScalarDefinition = {}> = IsPayLoad<DST> extends { __alias: infer R }
  ? {
      [P in keyof R]: MapType<SRC, R[P], SCLR>[keyof MapType<SRC, R[P], SCLR>];
    } & MapType<SRC, Omit<IsPayLoad<DST>, '__alias'>, SCLR>
  : MapType<SRC, IsPayLoad<DST>, SCLR>;
export type SubscriptionToGraphQL<Z, T, SCLR extends ScalarDefinition> = {
  ws: WebSocket;
  on: (fn: (args: InputType<T, Z, SCLR>) => void) => void;
  off: (fn: (e: { data?: InputType<T, Z, SCLR>; code?: number; reason?: string; message?: string }) => void) => void;
  error: (fn: (e: { data?: InputType<T, Z, SCLR>; errors?: string[] }) => void) => void;
  open: () => void;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export type FromSelector<SELECTOR, NAME extends keyof GraphQLTypes, SCLR extends ScalarDefinition = {}> = InputType<
  GraphQLTypes[NAME],
  SELECTOR,
  SCLR
>;

export type ScalarResolver = {
  encode?: (s: unknown) => string;
  decode?: (s: unknown) => unknown;
};

export type SelectionFunction<V> = <T>(t: T | V) => T;

type BuiltInVariableTypes = {
  ['String']: string;
  ['Int']: number;
  ['Float']: number;
  ['ID']: unknown;
  ['Boolean']: boolean;
};
type AllVariableTypes = keyof BuiltInVariableTypes | keyof ZEUS_VARIABLES;
type VariableRequired<T extends string> = `${T}!` | T | `[${T}]` | `[${T}]!` | `[${T}!]` | `[${T}!]!`;
type VR<T extends string> = VariableRequired<VariableRequired<T>>;

export type GraphQLVariableType = VR<AllVariableTypes>;

type ExtractVariableTypeString<T extends string> = T extends VR<infer R1>
  ? R1 extends VR<infer R2>
    ? R2 extends VR<infer R3>
      ? R3 extends VR<infer R4>
        ? R4 extends VR<infer R5>
          ? R5
          : R4
        : R3
      : R2
    : R1
  : T;

type DecomposeType<T, Type> = T extends `[${infer R}]`
  ? Array<DecomposeType<R, Type>> | undefined
  : T extends `${infer R}!`
  ? NonNullable<DecomposeType<R, Type>>
  : Type | undefined;

type ExtractTypeFromGraphQLType<T extends string> = T extends keyof ZEUS_VARIABLES
  ? ZEUS_VARIABLES[T]
  : T extends keyof BuiltInVariableTypes
  ? BuiltInVariableTypes[T]
  : any;

export type GetVariableType<T extends string> = DecomposeType<
  T,
  ExtractTypeFromGraphQLType<ExtractVariableTypeString<T>>
>;

type UndefinedKeys<T> = {
  [K in keyof T]-?: T[K] extends NonNullable<T[K]> ? never : K;
}[keyof T];

type WithNullableKeys<T> = Pick<T, UndefinedKeys<T>>;
type WithNonNullableKeys<T> = Omit<T, UndefinedKeys<T>>;

type OptionalKeys<T> = {
  [P in keyof T]?: T[P];
};

export type WithOptionalNullables<T> = OptionalKeys<WithNullableKeys<T>> & WithNonNullableKeys<T>;

export type Variable<T extends GraphQLVariableType, Name extends string> = {
  ' __zeus_name': Name;
  ' __zeus_type': T;
};

export type ExtractVariables<Query> = Query extends Variable<infer VType, infer VName>
  ? { [key in VName]: GetVariableType<VType> }
  : Query extends [infer Inputs, infer Outputs]
  ? ExtractVariables<Inputs> & ExtractVariables<Outputs>
  : Query extends string | number | boolean
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {}
  : UnionToIntersection<{ [K in keyof Query]: WithOptionalNullables<ExtractVariables<Query[K]>> }[keyof Query]>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export const START_VAR_NAME = `$ZEUS_VAR`;
export const GRAPHQL_TYPE_SEPARATOR = `__$GRAPHQL__`;

export const $ = <Type extends GraphQLVariableType, Name extends string>(name: Name, graphqlType: Type) => {
  return (START_VAR_NAME + name + GRAPHQL_TYPE_SEPARATOR + graphqlType) as unknown as Variable<Type, Name>;
};
type ZEUS_INTERFACES = GraphQLTypes["UsersNode"] | GraphQLTypes["Node"]
export type ScalarCoders = {
}
type ZEUS_UNIONS = never

export type ValueTypes = {
    ["UsersProviderErrors"]:UsersProviderErrors;
	["UsersInvitationTeamToken"]: AliasType<{
	_id?:boolean | `@${string}`,
	recipient?:boolean | `@${string}`,
	status?:boolean | `@${string}`,
	teamId?:boolean | `@${string}`,
	teamName?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Represents operations that can be performed on a project. */
["ProjectOps"]: AliasType<{
	/** Deletes a project. */
	delete?:boolean | `@${string}`,
update?: [{	/** The project object to be updated. */
	project: ValueTypes["UpdateProject"] | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	/** Represents member-related queries. */
["MemberQuery"]: AliasType<{
	/** Retrieves the team associated with the member. */
	team?:ValueTypes["UsersTeam"],
		__typename?: boolean | `@${string}`
}>;
	/** Represents user-related mutations. */
["UserMutation"]: AliasType<{
createTeam?: [{	/** The name of the team. */
	teamName: string | Variable<any, string>},ValueTypes["UsersCreateTeamResponse"]],
joinToTeam?: [{	/** The ID of the team. */
	teamId: string | Variable<any, string>},ValueTypes["UsersJoinToTeamResponse"]],
joinToTeamWithInvitationToken?: [{	/** The invitation token. */
	token: string | Variable<any, string>},ValueTypes["UsersJoinToTeamWithInvitationTokenResponse"]],
		__typename?: boolean | `@${string}`
}>;
	["UsersGenerateInviteTokenError"]:UsersGenerateInviteTokenError;
	/** Represents login-related queries. */
["LoginQuery"]: AliasType<{
password?: [{	/** The login input object. */
	user: ValueTypes["UsersLoginInput"] | Variable<any, string>},ValueTypes["UsersLoginResponse"]],
provider?: [{	/** The provider login input object. */
	params: ValueTypes["UsersProviderLoginInput"] | Variable<any, string>},ValueTypes["UsersProviderLoginQuery"]],
refreshToken?: [{	/** The refresh token. */
	refreshToken: string | Variable<any, string>},boolean | `@${string}`],
requestForForgotPassword?: [{	/** The username for the forgot password request. */
	username: string | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	/** Represents a mutation. */
["Mutation"]: AliasType<{
	/** Mutations related to admin actions. */
	admin?:ValueTypes["AdminMutation"],
adminMemberMutation?: [{	/** The ID of the team. */
	teamId: string | Variable<any, string>},ValueTypes["AdminMemberMutation"]],
	/** Mutations related to sending emails. */
	mail?:ValueTypes["MailMutation"],
	/** Mutations related to public actions. */
	public?:ValueTypes["PublicMutation"],
	/** Mutations related to user actions. */
	userMutation?:ValueTypes["UserMutation"],
		__typename?: boolean | `@${string}`
}>;
	["CreateProject"]: {
	/** The name of the project. */
	name: string | Variable<any, string>,
	/** The emails associated with the project. */
	emails: Array<string> | Variable<any, string>,
	url?: Array<string> | undefined | null | Variable<any, string>,
	teamId: string | Variable<any, string>
};
	["UsersRegisterResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	registered?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersVerifyEmailResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersJoinToTeamError"]:UsersJoinToTeamError;
	["UsersRemoveUserFromTeamResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersNode"]:AliasType<{
		_id?:boolean | `@${string}`;
		['...on UsersInvitationTeamToken']?: Omit<ValueTypes["UsersInvitationTeamToken"],keyof ValueTypes["UsersNode"]>;
		['...on UsersUserAuth']?: Omit<ValueTypes["UsersUserAuth"],keyof ValueTypes["UsersNode"]>;
		['...on UsersTeam']?: Omit<ValueTypes["UsersTeam"],keyof ValueTypes["UsersNode"]>;
		['...on UsersUser']?: Omit<ValueTypes["UsersUser"],keyof ValueTypes["UsersNode"]>;
		['...on UsersInviteToken']?: Omit<ValueTypes["UsersInviteToken"],keyof ValueTypes["UsersNode"]>;
		['...on UsersTeamAuthType']?: Omit<ValueTypes["UsersTeamAuthType"],keyof ValueTypes["UsersNode"]>;
		['...on UsersTeamMember']?: Omit<ValueTypes["UsersTeamMember"],keyof ValueTypes["UsersNode"]>;
		['...on UsersSocial']?: Omit<ValueTypes["UsersSocial"],keyof ValueTypes["UsersNode"]>;
		__typename?: boolean | `@${string}`
}>;
	["UsersGenerateInviteTokenResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersUserAuth"]: AliasType<{
	_id?:boolean | `@${string}`,
	password?:boolean | `@${string}`,
	username?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersProviderResponse"]: AliasType<{
	accessToken?:boolean | `@${string}`,
	hasError?:boolean | `@${string}`,
	/** same value as accessToken, for delete in future, 
improvise, adapt, overcome, frontend! */
	jwt?:boolean | `@${string}`,
	providerAccessToken?:boolean | `@${string}`,
	refreshToken?:boolean | `@${string}`,
	/** field describes whether this is first login attempt for this username */
	register?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersTeam"]: AliasType<{
	_id?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	members?:ValueTypes["UsersTeamMember"],
	name?:boolean | `@${string}`,
	owner?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersInvitationTeamStatus"]:UsersInvitationTeamStatus;
	["UsersUser"]: AliasType<{
	_id?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	emailConfirmed?:boolean | `@${string}`,
	teams?:ValueTypes["UsersTeam"],
	username?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Represents admin member-related mutations. */
["AdminMemberMutation"]: AliasType<{
deleteInviteToken?: [{	/** The ID of the invite token. */
	id: string | Variable<any, string>},boolean | `@${string}`],
generateInviteToken?: [{	/** The token options object. */
	tokenOptions: ValueTypes["UsersInviteTokenInput"] | Variable<any, string>},ValueTypes["UsersGenerateInviteTokenResponse"]],
removeUserFromTeam?: [{	/** The remove user from team input object. */
	data: ValueTypes["UsersRemoveUserFromTeamInput"] | Variable<any, string>},ValueTypes["UsersRemoveUserFromTeamResponse"]],
sendInvitationToTeam?: [{	/** The send team invitation input object. */
	invitation: ValueTypes["UsersSendTeamInvitationInput"] | Variable<any, string>},ValueTypes["UsersSendInvitationToTeamResponse"]],
		__typename?: boolean | `@${string}`
}>;
	["UsersLoginErrors"]:UsersLoginErrors;
	["UsersProviderLoginInput"]: {
	code: string | Variable<any, string>,
	redirectUri: string | Variable<any, string>
};
	["UsersProviderLoginQuery"]: AliasType<{
	apple?:ValueTypes["UsersProviderResponse"],
	github?:ValueTypes["UsersProviderResponse"],
	google?:ValueTypes["UsersProviderResponse"],
	microsoft?:ValueTypes["UsersProviderResponse"],
		__typename?: boolean | `@${string}`
}>;
	/** Represents admin member-related queries. */
["AdminMemberQuery"]: AliasType<{
	/** Retrieves invite tokens. */
	showInviteTokens?:ValueTypes["UsersInviteToken"],
showTeamInvitations?: [{	/** Determines whether the invitations are sent from the user's team. */
	sentFromMyTeam?: boolean | undefined | null | Variable<any, string>,	/** The status of the team invitations. */
	status?: ValueTypes["UsersInvitationTeamStatus"] | undefined | null | Variable<any, string>},ValueTypes["UsersInvitationTeamToken"]],
		__typename?: boolean | `@${string}`
}>;
	["UsersInviteToken"]: AliasType<{
	_id?:boolean | `@${string}`,
	domain?:boolean | `@${string}`,
	expires?:boolean | `@${string}`,
	owner?:boolean | `@${string}`,
	teamId?:boolean | `@${string}`,
	token?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersInviteTokenInput"]: {
	expires?: string | undefined | null | Variable<any, string>,
	domain?: string | undefined | null | Variable<any, string>,
	teamId?: string | undefined | null | Variable<any, string>
};
	["UsersLoginInput"]: {
	username: string | Variable<any, string>,
	password: string | Variable<any, string>
};
	/** To enter mail mutation user has to provide PublicKey header.  */
["MailMutation"]: AliasType<{
sendMail?: [{	/** The email object. */
	mail: ValueTypes["MailInput"] | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	/** For PoC, let's make it:

## Header
`Authorization: admin-123456789-key` */
["AdminMutation"]: AliasType<{
addProject?: [{	/** The project object to be created. */
	project: ValueTypes["CreateProject"] | Variable<any, string>},boolean | `@${string}`],
projectOps?: [{	/** The ID of the project. */
	_id: string | Variable<any, string>,	teamId: string | Variable<any, string>},ValueTypes["ProjectOps"]],
		__typename?: boolean | `@${string}`
}>;
	["UsersLoginResponse"]: AliasType<{
	accessToken?:boolean | `@${string}`,
	hasError?:boolean | `@${string}`,
	/** same value as accessToken, for delete in future, 
improvise, adapt, overcome, frontend! */
	login?:boolean | `@${string}`,
	refreshToken?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["MailInput"]: {
	/** The body of the email. Can be in HTML format. */
	body: string | Variable<any, string>,
	/** The subject of the email. */
	subject: string | Variable<any, string>,
	/** The email address to reply to. */
	replyTo: string | Variable<any, string>,
	/** The public key header. */
	publicKey: string | Variable<any, string>
};
	["UsersCreateTeamError"]:UsersCreateTeamError;
	["UsersJoinToTeamResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersSendTeamInvitationInput"]: {
	username: string | Variable<any, string>,
	teamId: string | Variable<any, string>
};
	["UsersTeamAuthType"]: AliasType<{
	_id?:boolean | `@${string}`,
	members?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	owner?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersChangePasswordWithTokenInput"]: {
	username: string | Variable<any, string>,
	forgotToken: string | Variable<any, string>,
	newPassword: string | Variable<any, string>
};
	["UsersRegisterInput"]: {
	invitationToken?: string | undefined | null | Variable<any, string>,
	username: string | Variable<any, string>,
	password: string | Variable<any, string>
};
	["UsersJoinToTeamWithInvitationTokenResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersSendInvitationToTeamError"]:UsersSendInvitationToTeamError;
	/** For PoC, let's make it:

## Header
`Authorization: admin-123456789-key` */
["AdminQuery"]: AliasType<{
projects?: [{	teamId?: string | undefined | null | Variable<any, string>},ValueTypes["Project"]],
		__typename?: boolean | `@${string}`
}>;
	/** Represents a project. */
["Project"]: AliasType<{
	/** The ID of the project. */
	_id?:boolean | `@${string}`,
	/** The creation date of the project. */
	createdAt?:boolean | `@${string}`,
	/** The emails associated with the project. */
	emails?:boolean | `@${string}`,
	/** The name of the project. */
	name?:boolean | `@${string}`,
	/** the owner is team which manage current project */
	owner?:boolean | `@${string}`,
	/** The public key of the project. */
	publicKey?:boolean | `@${string}`,
	urls?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersRemoveUserFromTeamInput"]: {
	userId: string | Variable<any, string>,
	teamId: string | Variable<any, string>
};
	["UsersSendInvitationToTeamResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersCreateTeamResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Represents a query. */
["Query"]: AliasType<{
	/** Retrieves admin-related queries. */
	admin?:ValueTypes["AdminQuery"],
adminMemberQuery?: [{	/** Determines whether the invitations are sent from the user's team. */
	sentFromMyTeam?: boolean | undefined | null | Variable<any, string>,	/** The status of the team invitations. */
	status?: ValueTypes["UsersInvitationTeamStatus"] | undefined | null | Variable<any, string>},ValueTypes["AdminMemberQuery"]],
getGoogleOAuthLink?: [{	/** The setup object for the OAuth link. */
	setup: ValueTypes["UsersGetOAuthInput"] | Variable<any, string>},boolean | `@${string}`],
	/** Retrieves login-related queries. */
	login?:ValueTypes["LoginQuery"],
memberQuery?: [{	/** The ID of the team. */
	teamId: string | Variable<any, string>},ValueTypes["MemberQuery"]],
	/** Retrieves user-related queries. */
	user?:ValueTypes["UserQuery"],
		__typename?: boolean | `@${string}`
}>;
	["UsersTeamMember"]: AliasType<{
	_id?:boolean | `@${string}`,
	username?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersSocial"]: AliasType<{
	_id?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	socialId?:boolean | `@${string}`,
	userId?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersChangePasswordWithTokenResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersGetOAuthInput"]: {
	state?: string | undefined | null | Variable<any, string>,
	redirectUri?: string | undefined | null | Variable<any, string>,
	scopes?: Array<string> | undefined | null | Variable<any, string>
};
	/** Represents user-related queries. */
["UserQuery"]: AliasType<{
	/** Retrieves the current user. */
	me?:ValueTypes["UsersUser"],
showTeamInvitations?: [{	/** The status of the team invitations. */
	status: ValueTypes["UsersInvitationTeamStatus"] | Variable<any, string>},ValueTypes["UsersInvitationTeamToken"]],
	/** Retrieves a list of teams associated with the user. */
	teams?:ValueTypes["UsersTeam"],
		__typename?: boolean | `@${string}`
}>;
	["UpdateProject"]: {
	/** The updated name of the project. */
	name?: string | undefined | null | Variable<any, string>,
	/** The updated emails associated with the project. */
	emails?: Array<string> | undefined | null | Variable<any, string>,
	url?: Array<string> | undefined | null | Variable<any, string>
};
	["UsersRegisterErrors"]:UsersRegisterErrors;
	["UsersChangePasswordWithTokenError"]:UsersChangePasswordWithTokenError;
	["UsersJoinToTeamWithInvitationTokenError"]:UsersJoinToTeamWithInvitationTokenError;
	/** Represents a node. */
["Node"]:AliasType<{
		/** The ID of the node. */
	_id?:boolean | `@${string}`,
	/** The creation date of the node. */
	createdAt?:boolean | `@${string}`;
		['...on Project']?: Omit<ValueTypes["Project"],keyof ValueTypes["Node"]>;
		__typename?: boolean | `@${string}`
}>;
	/** Represents a mutation for public actions. */
["PublicMutation"]: AliasType<{
changePasswordWithToken?: [{	/** The change password input object. */
	token: ValueTypes["UsersChangePasswordWithTokenInput"] | Variable<any, string>},ValueTypes["UsersChangePasswordWithTokenResponse"]],
register?: [{	/** The registration input object. */
	user: ValueTypes["UsersRegisterInput"] | Variable<any, string>},ValueTypes["UsersRegisterResponse"]],
verifyEmail?: [{	/** The verification email input object. */
	verifyData: ValueTypes["UsersVerifyEmailInput"] | Variable<any, string>},ValueTypes["UsersVerifyEmailResponse"]],
		__typename?: boolean | `@${string}`
}>;
	["UsersVerifyEmailInput"]: {
	token: string | Variable<any, string>
};
	["UsersVerifyEmailError"]:UsersVerifyEmailError
  }

export type ResolverInputTypes = {
    ["UsersProviderErrors"]:UsersProviderErrors;
	["UsersInvitationTeamToken"]: AliasType<{
	_id?:boolean | `@${string}`,
	recipient?:boolean | `@${string}`,
	status?:boolean | `@${string}`,
	teamId?:boolean | `@${string}`,
	teamName?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Represents operations that can be performed on a project. */
["ProjectOps"]: AliasType<{
	/** Deletes a project. */
	delete?:boolean | `@${string}`,
update?: [{	/** The project object to be updated. */
	project: ResolverInputTypes["UpdateProject"]},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	/** Represents member-related queries. */
["MemberQuery"]: AliasType<{
	/** Retrieves the team associated with the member. */
	team?:ResolverInputTypes["UsersTeam"],
		__typename?: boolean | `@${string}`
}>;
	/** Represents user-related mutations. */
["UserMutation"]: AliasType<{
createTeam?: [{	/** The name of the team. */
	teamName: string},ResolverInputTypes["UsersCreateTeamResponse"]],
joinToTeam?: [{	/** The ID of the team. */
	teamId: string},ResolverInputTypes["UsersJoinToTeamResponse"]],
joinToTeamWithInvitationToken?: [{	/** The invitation token. */
	token: string},ResolverInputTypes["UsersJoinToTeamWithInvitationTokenResponse"]],
		__typename?: boolean | `@${string}`
}>;
	["UsersGenerateInviteTokenError"]:UsersGenerateInviteTokenError;
	/** Represents login-related queries. */
["LoginQuery"]: AliasType<{
password?: [{	/** The login input object. */
	user: ResolverInputTypes["UsersLoginInput"]},ResolverInputTypes["UsersLoginResponse"]],
provider?: [{	/** The provider login input object. */
	params: ResolverInputTypes["UsersProviderLoginInput"]},ResolverInputTypes["UsersProviderLoginQuery"]],
refreshToken?: [{	/** The refresh token. */
	refreshToken: string},boolean | `@${string}`],
requestForForgotPassword?: [{	/** The username for the forgot password request. */
	username: string},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	/** Represents a mutation. */
["Mutation"]: AliasType<{
	/** Mutations related to admin actions. */
	admin?:ResolverInputTypes["AdminMutation"],
adminMemberMutation?: [{	/** The ID of the team. */
	teamId: string},ResolverInputTypes["AdminMemberMutation"]],
	/** Mutations related to sending emails. */
	mail?:ResolverInputTypes["MailMutation"],
	/** Mutations related to public actions. */
	public?:ResolverInputTypes["PublicMutation"],
	/** Mutations related to user actions. */
	userMutation?:ResolverInputTypes["UserMutation"],
		__typename?: boolean | `@${string}`
}>;
	["CreateProject"]: {
	/** The name of the project. */
	name: string,
	/** The emails associated with the project. */
	emails: Array<string>,
	url?: Array<string> | undefined | null,
	teamId: string
};
	["UsersRegisterResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	registered?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersVerifyEmailResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersJoinToTeamError"]:UsersJoinToTeamError;
	["UsersRemoveUserFromTeamResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersNode"]:AliasType<{
		_id?:boolean | `@${string}`;
		['...on UsersInvitationTeamToken']?: Omit<ResolverInputTypes["UsersInvitationTeamToken"],keyof ResolverInputTypes["UsersNode"]>;
		['...on UsersUserAuth']?: Omit<ResolverInputTypes["UsersUserAuth"],keyof ResolverInputTypes["UsersNode"]>;
		['...on UsersTeam']?: Omit<ResolverInputTypes["UsersTeam"],keyof ResolverInputTypes["UsersNode"]>;
		['...on UsersUser']?: Omit<ResolverInputTypes["UsersUser"],keyof ResolverInputTypes["UsersNode"]>;
		['...on UsersInviteToken']?: Omit<ResolverInputTypes["UsersInviteToken"],keyof ResolverInputTypes["UsersNode"]>;
		['...on UsersTeamAuthType']?: Omit<ResolverInputTypes["UsersTeamAuthType"],keyof ResolverInputTypes["UsersNode"]>;
		['...on UsersTeamMember']?: Omit<ResolverInputTypes["UsersTeamMember"],keyof ResolverInputTypes["UsersNode"]>;
		['...on UsersSocial']?: Omit<ResolverInputTypes["UsersSocial"],keyof ResolverInputTypes["UsersNode"]>;
		__typename?: boolean | `@${string}`
}>;
	["UsersGenerateInviteTokenResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersUserAuth"]: AliasType<{
	_id?:boolean | `@${string}`,
	password?:boolean | `@${string}`,
	username?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersProviderResponse"]: AliasType<{
	accessToken?:boolean | `@${string}`,
	hasError?:boolean | `@${string}`,
	/** same value as accessToken, for delete in future, 
improvise, adapt, overcome, frontend! */
	jwt?:boolean | `@${string}`,
	providerAccessToken?:boolean | `@${string}`,
	refreshToken?:boolean | `@${string}`,
	/** field describes whether this is first login attempt for this username */
	register?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersTeam"]: AliasType<{
	_id?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	members?:ResolverInputTypes["UsersTeamMember"],
	name?:boolean | `@${string}`,
	owner?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersInvitationTeamStatus"]:UsersInvitationTeamStatus;
	["UsersUser"]: AliasType<{
	_id?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	emailConfirmed?:boolean | `@${string}`,
	teams?:ResolverInputTypes["UsersTeam"],
	username?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Represents admin member-related mutations. */
["AdminMemberMutation"]: AliasType<{
deleteInviteToken?: [{	/** The ID of the invite token. */
	id: string},boolean | `@${string}`],
generateInviteToken?: [{	/** The token options object. */
	tokenOptions: ResolverInputTypes["UsersInviteTokenInput"]},ResolverInputTypes["UsersGenerateInviteTokenResponse"]],
removeUserFromTeam?: [{	/** The remove user from team input object. */
	data: ResolverInputTypes["UsersRemoveUserFromTeamInput"]},ResolverInputTypes["UsersRemoveUserFromTeamResponse"]],
sendInvitationToTeam?: [{	/** The send team invitation input object. */
	invitation: ResolverInputTypes["UsersSendTeamInvitationInput"]},ResolverInputTypes["UsersSendInvitationToTeamResponse"]],
		__typename?: boolean | `@${string}`
}>;
	["UsersLoginErrors"]:UsersLoginErrors;
	["UsersProviderLoginInput"]: {
	code: string,
	redirectUri: string
};
	["UsersProviderLoginQuery"]: AliasType<{
	apple?:ResolverInputTypes["UsersProviderResponse"],
	github?:ResolverInputTypes["UsersProviderResponse"],
	google?:ResolverInputTypes["UsersProviderResponse"],
	microsoft?:ResolverInputTypes["UsersProviderResponse"],
		__typename?: boolean | `@${string}`
}>;
	/** Represents admin member-related queries. */
["AdminMemberQuery"]: AliasType<{
	/** Retrieves invite tokens. */
	showInviteTokens?:ResolverInputTypes["UsersInviteToken"],
showTeamInvitations?: [{	/** Determines whether the invitations are sent from the user's team. */
	sentFromMyTeam?: boolean | undefined | null,	/** The status of the team invitations. */
	status?: ResolverInputTypes["UsersInvitationTeamStatus"] | undefined | null},ResolverInputTypes["UsersInvitationTeamToken"]],
		__typename?: boolean | `@${string}`
}>;
	["UsersInviteToken"]: AliasType<{
	_id?:boolean | `@${string}`,
	domain?:boolean | `@${string}`,
	expires?:boolean | `@${string}`,
	owner?:boolean | `@${string}`,
	teamId?:boolean | `@${string}`,
	token?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersInviteTokenInput"]: {
	expires?: string | undefined | null,
	domain?: string | undefined | null,
	teamId?: string | undefined | null
};
	["UsersLoginInput"]: {
	username: string,
	password: string
};
	/** To enter mail mutation user has to provide PublicKey header.  */
["MailMutation"]: AliasType<{
sendMail?: [{	/** The email object. */
	mail: ResolverInputTypes["MailInput"]},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	/** For PoC, let's make it:

## Header
`Authorization: admin-123456789-key` */
["AdminMutation"]: AliasType<{
addProject?: [{	/** The project object to be created. */
	project: ResolverInputTypes["CreateProject"]},boolean | `@${string}`],
projectOps?: [{	/** The ID of the project. */
	_id: string,	teamId: string},ResolverInputTypes["ProjectOps"]],
		__typename?: boolean | `@${string}`
}>;
	["UsersLoginResponse"]: AliasType<{
	accessToken?:boolean | `@${string}`,
	hasError?:boolean | `@${string}`,
	/** same value as accessToken, for delete in future, 
improvise, adapt, overcome, frontend! */
	login?:boolean | `@${string}`,
	refreshToken?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["MailInput"]: {
	/** The body of the email. Can be in HTML format. */
	body: string,
	/** The subject of the email. */
	subject: string,
	/** The email address to reply to. */
	replyTo: string,
	/** The public key header. */
	publicKey: string
};
	["UsersCreateTeamError"]:UsersCreateTeamError;
	["UsersJoinToTeamResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersSendTeamInvitationInput"]: {
	username: string,
	teamId: string
};
	["UsersTeamAuthType"]: AliasType<{
	_id?:boolean | `@${string}`,
	members?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	owner?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersChangePasswordWithTokenInput"]: {
	username: string,
	forgotToken: string,
	newPassword: string
};
	["UsersRegisterInput"]: {
	invitationToken?: string | undefined | null,
	username: string,
	password: string
};
	["UsersJoinToTeamWithInvitationTokenResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersSendInvitationToTeamError"]:UsersSendInvitationToTeamError;
	/** For PoC, let's make it:

## Header
`Authorization: admin-123456789-key` */
["AdminQuery"]: AliasType<{
projects?: [{	teamId?: string | undefined | null},ResolverInputTypes["Project"]],
		__typename?: boolean | `@${string}`
}>;
	/** Represents a project. */
["Project"]: AliasType<{
	/** The ID of the project. */
	_id?:boolean | `@${string}`,
	/** The creation date of the project. */
	createdAt?:boolean | `@${string}`,
	/** The emails associated with the project. */
	emails?:boolean | `@${string}`,
	/** The name of the project. */
	name?:boolean | `@${string}`,
	/** the owner is team which manage current project */
	owner?:boolean | `@${string}`,
	/** The public key of the project. */
	publicKey?:boolean | `@${string}`,
	urls?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersRemoveUserFromTeamInput"]: {
	userId: string,
	teamId: string
};
	["UsersSendInvitationToTeamResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersCreateTeamResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Represents a query. */
["Query"]: AliasType<{
	/** Retrieves admin-related queries. */
	admin?:ResolverInputTypes["AdminQuery"],
adminMemberQuery?: [{	/** Determines whether the invitations are sent from the user's team. */
	sentFromMyTeam?: boolean | undefined | null,	/** The status of the team invitations. */
	status?: ResolverInputTypes["UsersInvitationTeamStatus"] | undefined | null},ResolverInputTypes["AdminMemberQuery"]],
getGoogleOAuthLink?: [{	/** The setup object for the OAuth link. */
	setup: ResolverInputTypes["UsersGetOAuthInput"]},boolean | `@${string}`],
	/** Retrieves login-related queries. */
	login?:ResolverInputTypes["LoginQuery"],
memberQuery?: [{	/** The ID of the team. */
	teamId: string},ResolverInputTypes["MemberQuery"]],
	/** Retrieves user-related queries. */
	user?:ResolverInputTypes["UserQuery"],
		__typename?: boolean | `@${string}`
}>;
	["UsersTeamMember"]: AliasType<{
	_id?:boolean | `@${string}`,
	username?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersSocial"]: AliasType<{
	_id?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	socialId?:boolean | `@${string}`,
	userId?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersChangePasswordWithTokenResponse"]: AliasType<{
	hasError?:boolean | `@${string}`,
	result?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UsersGetOAuthInput"]: {
	state?: string | undefined | null,
	redirectUri?: string | undefined | null,
	scopes?: Array<string> | undefined | null
};
	/** Represents user-related queries. */
["UserQuery"]: AliasType<{
	/** Retrieves the current user. */
	me?:ResolverInputTypes["UsersUser"],
showTeamInvitations?: [{	/** The status of the team invitations. */
	status: ResolverInputTypes["UsersInvitationTeamStatus"]},ResolverInputTypes["UsersInvitationTeamToken"]],
	/** Retrieves a list of teams associated with the user. */
	teams?:ResolverInputTypes["UsersTeam"],
		__typename?: boolean | `@${string}`
}>;
	["UpdateProject"]: {
	/** The updated name of the project. */
	name?: string | undefined | null,
	/** The updated emails associated with the project. */
	emails?: Array<string> | undefined | null,
	url?: Array<string> | undefined | null
};
	["UsersRegisterErrors"]:UsersRegisterErrors;
	["UsersChangePasswordWithTokenError"]:UsersChangePasswordWithTokenError;
	["UsersJoinToTeamWithInvitationTokenError"]:UsersJoinToTeamWithInvitationTokenError;
	/** Represents a node. */
["Node"]:AliasType<{
		/** The ID of the node. */
	_id?:boolean | `@${string}`,
	/** The creation date of the node. */
	createdAt?:boolean | `@${string}`;
		['...on Project']?: Omit<ResolverInputTypes["Project"],keyof ResolverInputTypes["Node"]>;
		__typename?: boolean | `@${string}`
}>;
	/** Represents a mutation for public actions. */
["PublicMutation"]: AliasType<{
changePasswordWithToken?: [{	/** The change password input object. */
	token: ResolverInputTypes["UsersChangePasswordWithTokenInput"]},ResolverInputTypes["UsersChangePasswordWithTokenResponse"]],
register?: [{	/** The registration input object. */
	user: ResolverInputTypes["UsersRegisterInput"]},ResolverInputTypes["UsersRegisterResponse"]],
verifyEmail?: [{	/** The verification email input object. */
	verifyData: ResolverInputTypes["UsersVerifyEmailInput"]},ResolverInputTypes["UsersVerifyEmailResponse"]],
		__typename?: boolean | `@${string}`
}>;
	["UsersVerifyEmailInput"]: {
	token: string
};
	["UsersVerifyEmailError"]:UsersVerifyEmailError
  }

export type ModelTypes = {
    ["UsersProviderErrors"]:UsersProviderErrors;
	["UsersInvitationTeamToken"]: {
		_id: string,
	recipient: string,
	status: ModelTypes["UsersInvitationTeamStatus"],
	teamId: string,
	teamName: string
};
	/** Represents operations that can be performed on a project. */
["ProjectOps"]: {
		/** Deletes a project. */
	delete?: boolean | undefined,
	/** Updates a project. */
	update?: boolean | undefined
};
	/** Represents member-related queries. */
["MemberQuery"]: {
		/** Retrieves the team associated with the member. */
	team: ModelTypes["UsersTeam"]
};
	/** Represents user-related mutations. */
["UserMutation"]: {
		/** Creates a team. */
	createTeam: ModelTypes["UsersCreateTeamResponse"],
	/** Joins a user to a team. */
	joinToTeam: ModelTypes["UsersJoinToTeamResponse"],
	/** Joins a user to a team using an invitation token. */
	joinToTeamWithInvitationToken: ModelTypes["UsersJoinToTeamWithInvitationTokenResponse"]
};
	["UsersGenerateInviteTokenError"]:UsersGenerateInviteTokenError;
	/** Represents login-related queries. */
["LoginQuery"]: {
		/** Authenticates a user using a password. */
	password: ModelTypes["UsersLoginResponse"],
	/** Authenticates a user using a provider. */
	provider: ModelTypes["UsersProviderLoginQuery"],
	/** Refreshes an access token using a refresh token. */
	refreshToken: string,
	/** Sends a request for forgot password. */
	requestForForgotPassword: boolean
};
	/** Represents a mutation. */
["Mutation"]: {
		/** Mutations related to admin actions. */
	admin?: ModelTypes["AdminMutation"] | undefined,
	/** Mutations related to admin member actions. */
	adminMemberMutation: ModelTypes["AdminMemberMutation"],
	/** Mutations related to sending emails. */
	mail?: ModelTypes["MailMutation"] | undefined,
	/** Mutations related to public actions. */
	public?: ModelTypes["PublicMutation"] | undefined,
	/** Mutations related to user actions. */
	userMutation: ModelTypes["UserMutation"]
};
	["CreateProject"]: {
	/** The name of the project. */
	name: string,
	/** The emails associated with the project. */
	emails: Array<string>,
	url?: Array<string> | undefined,
	teamId: string
};
	["UsersRegisterResponse"]: {
		hasError?: ModelTypes["UsersRegisterErrors"] | undefined,
	registered?: boolean | undefined
};
	["UsersVerifyEmailResponse"]: {
		hasError?: ModelTypes["UsersVerifyEmailError"] | undefined,
	result?: boolean | undefined
};
	["UsersJoinToTeamError"]:UsersJoinToTeamError;
	["UsersRemoveUserFromTeamResponse"]: {
		hasError?: ModelTypes["UsersGenerateInviteTokenError"] | undefined,
	result?: boolean | undefined
};
	["UsersNode"]: ModelTypes["UsersInvitationTeamToken"] | ModelTypes["UsersUserAuth"] | ModelTypes["UsersTeam"] | ModelTypes["UsersUser"] | ModelTypes["UsersInviteToken"] | ModelTypes["UsersTeamAuthType"] | ModelTypes["UsersTeamMember"] | ModelTypes["UsersSocial"];
	["UsersGenerateInviteTokenResponse"]: {
		hasError?: ModelTypes["UsersGenerateInviteTokenError"] | undefined,
	result?: string | undefined
};
	["UsersUserAuth"]: {
		_id: string,
	password?: string | undefined,
	username: string
};
	["UsersProviderResponse"]: {
		accessToken?: string | undefined,
	hasError?: ModelTypes["UsersProviderErrors"] | undefined,
	/** same value as accessToken, for delete in future, 
improvise, adapt, overcome, frontend! */
	jwt?: string | undefined,
	providerAccessToken?: string | undefined,
	refreshToken?: string | undefined,
	/** field describes whether this is first login attempt for this username */
	register?: boolean | undefined
};
	["UsersTeam"]: {
		_id: string,
	createdAt?: string | undefined,
	members: Array<ModelTypes["UsersTeamMember"]>,
	name: string,
	owner?: string | undefined
};
	["UsersInvitationTeamStatus"]:UsersInvitationTeamStatus;
	["UsersUser"]: {
		_id: string,
	createdAt?: string | undefined,
	emailConfirmed: boolean,
	teams: Array<ModelTypes["UsersTeam"]>,
	username: string
};
	/** Represents admin member-related mutations. */
["AdminMemberMutation"]: {
		/** Deletes an invite token. */
	deleteInviteToken: boolean,
	/** Generates an invite token. */
	generateInviteToken: ModelTypes["UsersGenerateInviteTokenResponse"],
	/** Removes a user from a team. */
	removeUserFromTeam: ModelTypes["UsersRemoveUserFromTeamResponse"],
	/** Sends an invitation to a team. */
	sendInvitationToTeam: ModelTypes["UsersSendInvitationToTeamResponse"]
};
	["UsersLoginErrors"]:UsersLoginErrors;
	["UsersProviderLoginInput"]: {
	code: string,
	redirectUri: string
};
	["UsersProviderLoginQuery"]: {
		apple?: ModelTypes["UsersProviderResponse"] | undefined,
	github?: ModelTypes["UsersProviderResponse"] | undefined,
	google?: ModelTypes["UsersProviderResponse"] | undefined,
	microsoft?: ModelTypes["UsersProviderResponse"] | undefined
};
	/** Represents admin member-related queries. */
["AdminMemberQuery"]: {
		/** Retrieves invite tokens. */
	showInviteTokens: Array<ModelTypes["UsersInviteToken"]>,
	/** Retrieves team invitation tokens based on the specified parameters. */
	showTeamInvitations: Array<ModelTypes["UsersInvitationTeamToken"]>
};
	["UsersInviteToken"]: {
		_id: string,
	domain: string,
	expires: string,
	owner: string,
	teamId?: string | undefined,
	token: string
};
	["UsersInviteTokenInput"]: {
	expires?: string | undefined,
	domain?: string | undefined,
	teamId?: string | undefined
};
	["UsersLoginInput"]: {
	username: string,
	password: string
};
	/** To enter mail mutation user has to provide PublicKey header.  */
["MailMutation"]: {
		/** Sends an email. */
	sendMail?: boolean | undefined
};
	/** For PoC, let's make it:

## Header
`Authorization: admin-123456789-key` */
["AdminMutation"]: {
		/** Adds a project. */
	addProject?: string | undefined,
	/** Perform operations on a project. */
	projectOps?: ModelTypes["ProjectOps"] | undefined
};
	["UsersLoginResponse"]: {
		accessToken?: string | undefined,
	hasError?: ModelTypes["UsersLoginErrors"] | undefined,
	/** same value as accessToken, for delete in future, 
improvise, adapt, overcome, frontend! */
	login?: string | undefined,
	refreshToken?: string | undefined
};
	["MailInput"]: {
	/** The body of the email. Can be in HTML format. */
	body: string,
	/** The subject of the email. */
	subject: string,
	/** The email address to reply to. */
	replyTo: string,
	/** The public key header. */
	publicKey: string
};
	["UsersCreateTeamError"]:UsersCreateTeamError;
	["UsersJoinToTeamResponse"]: {
		hasError?: ModelTypes["UsersJoinToTeamError"] | undefined,
	result?: boolean | undefined
};
	["UsersSendTeamInvitationInput"]: {
	username: string,
	teamId: string
};
	["UsersTeamAuthType"]: {
		_id: string,
	members: Array<string>,
	name: string,
	owner?: string | undefined
};
	["UsersChangePasswordWithTokenInput"]: {
	username: string,
	forgotToken: string,
	newPassword: string
};
	["UsersRegisterInput"]: {
	invitationToken?: string | undefined,
	username: string,
	password: string
};
	["UsersJoinToTeamWithInvitationTokenResponse"]: {
		hasError?: ModelTypes["UsersJoinToTeamWithInvitationTokenError"] | undefined,
	result?: boolean | undefined
};
	["UsersSendInvitationToTeamError"]:UsersSendInvitationToTeamError;
	/** For PoC, let's make it:

## Header
`Authorization: admin-123456789-key` */
["AdminQuery"]: {
		/** Retrieves a list of projects. */
	projects?: Array<ModelTypes["Project"]> | undefined
};
	/** Represents a project. */
["Project"]: {
		/** The ID of the project. */
	_id: string,
	/** The creation date of the project. */
	createdAt: string,
	/** The emails associated with the project. */
	emails: Array<string>,
	/** The name of the project. */
	name: string,
	/** the owner is team which manage current project */
	owner?: string | undefined,
	/** The public key of the project. */
	publicKey: string,
	urls?: Array<string> | undefined
};
	["UsersRemoveUserFromTeamInput"]: {
	userId: string,
	teamId: string
};
	["UsersSendInvitationToTeamResponse"]: {
		hasError?: ModelTypes["UsersSendInvitationToTeamError"] | undefined,
	result?: boolean | undefined
};
	["UsersCreateTeamResponse"]: {
		hasError?: ModelTypes["UsersCreateTeamError"] | undefined,
	result?: string | undefined
};
	/** Represents a query. */
["Query"]: {
		/** Retrieves admin-related queries. */
	admin?: ModelTypes["AdminQuery"] | undefined,
	/** Retrieves admin member-related queries. */
	adminMemberQuery?: ModelTypes["AdminMemberQuery"] | undefined,
	/** Retrieves the Google OAuth link. */
	getGoogleOAuthLink: string,
	/** Retrieves login-related queries. */
	login: ModelTypes["LoginQuery"],
	/** Retrieves member-related queries. */
	memberQuery?: ModelTypes["MemberQuery"] | undefined,
	/** Retrieves user-related queries. */
	user: ModelTypes["UserQuery"]
};
	["UsersTeamMember"]: {
		_id: string,
	username: string
};
	["UsersSocial"]: {
		_id: string,
	createdAt?: string | undefined,
	socialId: string,
	userId: string
};
	["UsersChangePasswordWithTokenResponse"]: {
		hasError?: ModelTypes["UsersChangePasswordWithTokenError"] | undefined,
	result?: boolean | undefined
};
	["UsersGetOAuthInput"]: {
	state?: string | undefined,
	redirectUri?: string | undefined,
	scopes?: Array<string> | undefined
};
	/** Represents user-related queries. */
["UserQuery"]: {
		/** Retrieves the current user. */
	me?: ModelTypes["UsersUser"] | undefined,
	/** Retrieves team invitation tokens based on the specified status. */
	showTeamInvitations: Array<ModelTypes["UsersInvitationTeamToken"]>,
	/** Retrieves a list of teams associated with the user. */
	teams: Array<ModelTypes["UsersTeam"]>
};
	["UpdateProject"]: {
	/** The updated name of the project. */
	name?: string | undefined,
	/** The updated emails associated with the project. */
	emails?: Array<string> | undefined,
	url?: Array<string> | undefined
};
	["UsersRegisterErrors"]:UsersRegisterErrors;
	["UsersChangePasswordWithTokenError"]:UsersChangePasswordWithTokenError;
	["UsersJoinToTeamWithInvitationTokenError"]:UsersJoinToTeamWithInvitationTokenError;
	/** Represents a node. */
["Node"]: ModelTypes["Project"];
	/** Represents a mutation for public actions. */
["PublicMutation"]: {
		/** Changes the password using a token. */
	changePasswordWithToken: ModelTypes["UsersChangePasswordWithTokenResponse"],
	/** Registers a user. */
	register: ModelTypes["UsersRegisterResponse"],
	/** Verifies an email using a verification data object. */
	verifyEmail: ModelTypes["UsersVerifyEmailResponse"]
};
	["UsersVerifyEmailInput"]: {
	token: string
};
	["UsersVerifyEmailError"]:UsersVerifyEmailError
    }

export type GraphQLTypes = {
    ["UsersProviderErrors"]: UsersProviderErrors;
	["UsersInvitationTeamToken"]: {
	__typename: "UsersInvitationTeamToken",
	_id: string,
	recipient: string,
	status: GraphQLTypes["UsersInvitationTeamStatus"],
	teamId: string,
	teamName: string
};
	/** Represents operations that can be performed on a project. */
["ProjectOps"]: {
	__typename: "ProjectOps",
	/** Deletes a project. */
	delete?: boolean | undefined,
	/** Updates a project. */
	update?: boolean | undefined
};
	/** Represents member-related queries. */
["MemberQuery"]: {
	__typename: "MemberQuery",
	/** Retrieves the team associated with the member. */
	team: GraphQLTypes["UsersTeam"]
};
	/** Represents user-related mutations. */
["UserMutation"]: {
	__typename: "UserMutation",
	/** Creates a team. */
	createTeam: GraphQLTypes["UsersCreateTeamResponse"],
	/** Joins a user to a team. */
	joinToTeam: GraphQLTypes["UsersJoinToTeamResponse"],
	/** Joins a user to a team using an invitation token. */
	joinToTeamWithInvitationToken: GraphQLTypes["UsersJoinToTeamWithInvitationTokenResponse"]
};
	["UsersGenerateInviteTokenError"]: UsersGenerateInviteTokenError;
	/** Represents login-related queries. */
["LoginQuery"]: {
	__typename: "LoginQuery",
	/** Authenticates a user using a password. */
	password: GraphQLTypes["UsersLoginResponse"],
	/** Authenticates a user using a provider. */
	provider: GraphQLTypes["UsersProviderLoginQuery"],
	/** Refreshes an access token using a refresh token. */
	refreshToken: string,
	/** Sends a request for forgot password. */
	requestForForgotPassword: boolean
};
	/** Represents a mutation. */
["Mutation"]: {
	__typename: "Mutation",
	/** Mutations related to admin actions. */
	admin?: GraphQLTypes["AdminMutation"] | undefined,
	/** Mutations related to admin member actions. */
	adminMemberMutation: GraphQLTypes["AdminMemberMutation"],
	/** Mutations related to sending emails. */
	mail?: GraphQLTypes["MailMutation"] | undefined,
	/** Mutations related to public actions. */
	public?: GraphQLTypes["PublicMutation"] | undefined,
	/** Mutations related to user actions. */
	userMutation: GraphQLTypes["UserMutation"]
};
	["CreateProject"]: {
		/** The name of the project. */
	name: string,
	/** The emails associated with the project. */
	emails: Array<string>,
	url?: Array<string> | undefined,
	teamId: string
};
	["UsersRegisterResponse"]: {
	__typename: "UsersRegisterResponse",
	hasError?: GraphQLTypes["UsersRegisterErrors"] | undefined,
	registered?: boolean | undefined
};
	["UsersVerifyEmailResponse"]: {
	__typename: "UsersVerifyEmailResponse",
	hasError?: GraphQLTypes["UsersVerifyEmailError"] | undefined,
	result?: boolean | undefined
};
	["UsersJoinToTeamError"]: UsersJoinToTeamError;
	["UsersRemoveUserFromTeamResponse"]: {
	__typename: "UsersRemoveUserFromTeamResponse",
	hasError?: GraphQLTypes["UsersGenerateInviteTokenError"] | undefined,
	result?: boolean | undefined
};
	["UsersNode"]: {
	__typename:"UsersInvitationTeamToken" | "UsersUserAuth" | "UsersTeam" | "UsersUser" | "UsersInviteToken" | "UsersTeamAuthType" | "UsersTeamMember" | "UsersSocial",
	_id: string
	['...on UsersInvitationTeamToken']: '__union' & GraphQLTypes["UsersInvitationTeamToken"];
	['...on UsersUserAuth']: '__union' & GraphQLTypes["UsersUserAuth"];
	['...on UsersTeam']: '__union' & GraphQLTypes["UsersTeam"];
	['...on UsersUser']: '__union' & GraphQLTypes["UsersUser"];
	['...on UsersInviteToken']: '__union' & GraphQLTypes["UsersInviteToken"];
	['...on UsersTeamAuthType']: '__union' & GraphQLTypes["UsersTeamAuthType"];
	['...on UsersTeamMember']: '__union' & GraphQLTypes["UsersTeamMember"];
	['...on UsersSocial']: '__union' & GraphQLTypes["UsersSocial"];
};
	["UsersGenerateInviteTokenResponse"]: {
	__typename: "UsersGenerateInviteTokenResponse",
	hasError?: GraphQLTypes["UsersGenerateInviteTokenError"] | undefined,
	result?: string | undefined
};
	["UsersUserAuth"]: {
	__typename: "UsersUserAuth",
	_id: string,
	password?: string | undefined,
	username: string
};
	["UsersProviderResponse"]: {
	__typename: "UsersProviderResponse",
	accessToken?: string | undefined,
	hasError?: GraphQLTypes["UsersProviderErrors"] | undefined,
	/** same value as accessToken, for delete in future, 
improvise, adapt, overcome, frontend! */
	jwt?: string | undefined,
	providerAccessToken?: string | undefined,
	refreshToken?: string | undefined,
	/** field describes whether this is first login attempt for this username */
	register?: boolean | undefined
};
	["UsersTeam"]: {
	__typename: "UsersTeam",
	_id: string,
	createdAt?: string | undefined,
	members: Array<GraphQLTypes["UsersTeamMember"]>,
	name: string,
	owner?: string | undefined
};
	["UsersInvitationTeamStatus"]: UsersInvitationTeamStatus;
	["UsersUser"]: {
	__typename: "UsersUser",
	_id: string,
	createdAt?: string | undefined,
	emailConfirmed: boolean,
	teams: Array<GraphQLTypes["UsersTeam"]>,
	username: string
};
	/** Represents admin member-related mutations. */
["AdminMemberMutation"]: {
	__typename: "AdminMemberMutation",
	/** Deletes an invite token. */
	deleteInviteToken: boolean,
	/** Generates an invite token. */
	generateInviteToken: GraphQLTypes["UsersGenerateInviteTokenResponse"],
	/** Removes a user from a team. */
	removeUserFromTeam: GraphQLTypes["UsersRemoveUserFromTeamResponse"],
	/** Sends an invitation to a team. */
	sendInvitationToTeam: GraphQLTypes["UsersSendInvitationToTeamResponse"]
};
	["UsersLoginErrors"]: UsersLoginErrors;
	["UsersProviderLoginInput"]: {
		code: string,
	redirectUri: string
};
	["UsersProviderLoginQuery"]: {
	__typename: "UsersProviderLoginQuery",
	apple?: GraphQLTypes["UsersProviderResponse"] | undefined,
	github?: GraphQLTypes["UsersProviderResponse"] | undefined,
	google?: GraphQLTypes["UsersProviderResponse"] | undefined,
	microsoft?: GraphQLTypes["UsersProviderResponse"] | undefined
};
	/** Represents admin member-related queries. */
["AdminMemberQuery"]: {
	__typename: "AdminMemberQuery",
	/** Retrieves invite tokens. */
	showInviteTokens: Array<GraphQLTypes["UsersInviteToken"]>,
	/** Retrieves team invitation tokens based on the specified parameters. */
	showTeamInvitations: Array<GraphQLTypes["UsersInvitationTeamToken"]>
};
	["UsersInviteToken"]: {
	__typename: "UsersInviteToken",
	_id: string,
	domain: string,
	expires: string,
	owner: string,
	teamId?: string | undefined,
	token: string
};
	["UsersInviteTokenInput"]: {
		expires?: string | undefined,
	domain?: string | undefined,
	teamId?: string | undefined
};
	["UsersLoginInput"]: {
		username: string,
	password: string
};
	/** To enter mail mutation user has to provide PublicKey header.  */
["MailMutation"]: {
	__typename: "MailMutation",
	/** Sends an email. */
	sendMail?: boolean | undefined
};
	/** For PoC, let's make it:

## Header
`Authorization: admin-123456789-key` */
["AdminMutation"]: {
	__typename: "AdminMutation",
	/** Adds a project. */
	addProject?: string | undefined,
	/** Perform operations on a project. */
	projectOps?: GraphQLTypes["ProjectOps"] | undefined
};
	["UsersLoginResponse"]: {
	__typename: "UsersLoginResponse",
	accessToken?: string | undefined,
	hasError?: GraphQLTypes["UsersLoginErrors"] | undefined,
	/** same value as accessToken, for delete in future, 
improvise, adapt, overcome, frontend! */
	login?: string | undefined,
	refreshToken?: string | undefined
};
	["MailInput"]: {
		/** The body of the email. Can be in HTML format. */
	body: string,
	/** The subject of the email. */
	subject: string,
	/** The email address to reply to. */
	replyTo: string,
	/** The public key header. */
	publicKey: string
};
	["UsersCreateTeamError"]: UsersCreateTeamError;
	["UsersJoinToTeamResponse"]: {
	__typename: "UsersJoinToTeamResponse",
	hasError?: GraphQLTypes["UsersJoinToTeamError"] | undefined,
	result?: boolean | undefined
};
	["UsersSendTeamInvitationInput"]: {
		username: string,
	teamId: string
};
	["UsersTeamAuthType"]: {
	__typename: "UsersTeamAuthType",
	_id: string,
	members: Array<string>,
	name: string,
	owner?: string | undefined
};
	["UsersChangePasswordWithTokenInput"]: {
		username: string,
	forgotToken: string,
	newPassword: string
};
	["UsersRegisterInput"]: {
		invitationToken?: string | undefined,
	username: string,
	password: string
};
	["UsersJoinToTeamWithInvitationTokenResponse"]: {
	__typename: "UsersJoinToTeamWithInvitationTokenResponse",
	hasError?: GraphQLTypes["UsersJoinToTeamWithInvitationTokenError"] | undefined,
	result?: boolean | undefined
};
	["UsersSendInvitationToTeamError"]: UsersSendInvitationToTeamError;
	/** For PoC, let's make it:

## Header
`Authorization: admin-123456789-key` */
["AdminQuery"]: {
	__typename: "AdminQuery",
	/** Retrieves a list of projects. */
	projects?: Array<GraphQLTypes["Project"]> | undefined
};
	/** Represents a project. */
["Project"]: {
	__typename: "Project",
	/** The ID of the project. */
	_id: string,
	/** The creation date of the project. */
	createdAt: string,
	/** The emails associated with the project. */
	emails: Array<string>,
	/** The name of the project. */
	name: string,
	/** the owner is team which manage current project */
	owner?: string | undefined,
	/** The public key of the project. */
	publicKey: string,
	urls?: Array<string> | undefined
};
	["UsersRemoveUserFromTeamInput"]: {
		userId: string,
	teamId: string
};
	["UsersSendInvitationToTeamResponse"]: {
	__typename: "UsersSendInvitationToTeamResponse",
	hasError?: GraphQLTypes["UsersSendInvitationToTeamError"] | undefined,
	result?: boolean | undefined
};
	["UsersCreateTeamResponse"]: {
	__typename: "UsersCreateTeamResponse",
	hasError?: GraphQLTypes["UsersCreateTeamError"] | undefined,
	result?: string | undefined
};
	/** Represents a query. */
["Query"]: {
	__typename: "Query",
	/** Retrieves admin-related queries. */
	admin?: GraphQLTypes["AdminQuery"] | undefined,
	/** Retrieves admin member-related queries. */
	adminMemberQuery?: GraphQLTypes["AdminMemberQuery"] | undefined,
	/** Retrieves the Google OAuth link. */
	getGoogleOAuthLink: string,
	/** Retrieves login-related queries. */
	login: GraphQLTypes["LoginQuery"],
	/** Retrieves member-related queries. */
	memberQuery?: GraphQLTypes["MemberQuery"] | undefined,
	/** Retrieves user-related queries. */
	user: GraphQLTypes["UserQuery"]
};
	["UsersTeamMember"]: {
	__typename: "UsersTeamMember",
	_id: string,
	username: string
};
	["UsersSocial"]: {
	__typename: "UsersSocial",
	_id: string,
	createdAt?: string | undefined,
	socialId: string,
	userId: string
};
	["UsersChangePasswordWithTokenResponse"]: {
	__typename: "UsersChangePasswordWithTokenResponse",
	hasError?: GraphQLTypes["UsersChangePasswordWithTokenError"] | undefined,
	result?: boolean | undefined
};
	["UsersGetOAuthInput"]: {
		state?: string | undefined,
	redirectUri?: string | undefined,
	scopes?: Array<string> | undefined
};
	/** Represents user-related queries. */
["UserQuery"]: {
	__typename: "UserQuery",
	/** Retrieves the current user. */
	me?: GraphQLTypes["UsersUser"] | undefined,
	/** Retrieves team invitation tokens based on the specified status. */
	showTeamInvitations: Array<GraphQLTypes["UsersInvitationTeamToken"]>,
	/** Retrieves a list of teams associated with the user. */
	teams: Array<GraphQLTypes["UsersTeam"]>
};
	["UpdateProject"]: {
		/** The updated name of the project. */
	name?: string | undefined,
	/** The updated emails associated with the project. */
	emails?: Array<string> | undefined,
	url?: Array<string> | undefined
};
	["UsersRegisterErrors"]: UsersRegisterErrors;
	["UsersChangePasswordWithTokenError"]: UsersChangePasswordWithTokenError;
	["UsersJoinToTeamWithInvitationTokenError"]: UsersJoinToTeamWithInvitationTokenError;
	/** Represents a node. */
["Node"]: {
	__typename:"Project",
	/** The ID of the node. */
	_id: string,
	/** The creation date of the node. */
	createdAt: string
	['...on Project']: '__union' & GraphQLTypes["Project"];
};
	/** Represents a mutation for public actions. */
["PublicMutation"]: {
	__typename: "PublicMutation",
	/** Changes the password using a token. */
	changePasswordWithToken: GraphQLTypes["UsersChangePasswordWithTokenResponse"],
	/** Registers a user. */
	register: GraphQLTypes["UsersRegisterResponse"],
	/** Verifies an email using a verification data object. */
	verifyEmail: GraphQLTypes["UsersVerifyEmailResponse"]
};
	["UsersVerifyEmailInput"]: {
		token: string
};
	["UsersVerifyEmailError"]: UsersVerifyEmailError
    }
export const enum UsersProviderErrors {
	CANNOT_RETRIVE_USER_INFORMATION_FROM_APPLE = "CANNOT_RETRIVE_USER_INFORMATION_FROM_APPLE",
	CODE_IS_NOT_EXIST_IN_ARGS = "CODE_IS_NOT_EXIST_IN_ARGS",
	CANNOT_RETRIVE_SUB_FIELD_FROM_JWT_TOKEN = "CANNOT_RETRIVE_SUB_FIELD_FROM_JWT_TOKEN",
	CANNOT_RETRIVE_TOKEN_FROM_MICROSOFT = "CANNOT_RETRIVE_TOKEN_FROM_MICROSOFT",
	CANNOT_RETRIVE_PROFILE_FROM_GOOGLE_TRY_REFRESH_TOKEN = "CANNOT_RETRIVE_PROFILE_FROM_GOOGLE_TRY_REFRESH_TOKEN",
	CANNOT_FIND_EMAIL_FOR_THIS_PROFIL = "CANNOT_FIND_EMAIL_FOR_THIS_PROFIL"
}
export const enum UsersGenerateInviteTokenError {
	YOU_ARE_NOT_THE_OWNER_OF_A_TEAM_OR_TEAM_DOES_NOT_EXIST = "YOU_ARE_NOT_THE_OWNER_OF_A_TEAM_OR_TEAM_DOES_NOT_EXIST"
}
export const enum UsersJoinToTeamError {
	TEAM_INVITATION_DOES_NOT_EXIST_OR_CAPTURED = "TEAM_INVITATION_DOES_NOT_EXIST_OR_CAPTURED",
	MEMBER_ALREADY_EXISTS_IN_THE_TEAM = "MEMBER_ALREADY_EXISTS_IN_THE_TEAM"
}
export const enum UsersInvitationTeamStatus {
	Waiting = "Waiting",
	Taken = "Taken"
}
export const enum UsersLoginErrors {
	CONFIRM_EMAIL_BEFOR_LOGIN = "CONFIRM_EMAIL_BEFOR_LOGIN",
	INVALID_LOGIN_OR_PASSWORD = "INVALID_LOGIN_OR_PASSWORD",
	CANNOT_FIND_CONNECTED_USER = "CANNOT_FIND_CONNECTED_USER",
	YOU_PROVIDED_OTHER_METHOD_OF_LOGIN_ON_THIS_EMAIL = "YOU_PROVIDED_OTHER_METHOD_OF_LOGIN_ON_THIS_EMAIL",
	UNEXPECTED_ERROR = "UNEXPECTED_ERROR"
}
export const enum UsersCreateTeamError {
	TEAM_NOT_CREATED = "TEAM_NOT_CREATED"
}
export const enum UsersSendInvitationToTeamError {
	USER_ALREADY_HAS_YOUR_INVITATION = "USER_ALREADY_HAS_YOUR_INVITATION",
	YOU_CANNOT_SEND_INVITATION_TO_YOURSELF = "YOU_CANNOT_SEND_INVITATION_TO_YOURSELF",
	USER_IS_NOT_OWNER_OF_THE_TEAM = "USER_IS_NOT_OWNER_OF_THE_TEAM",
	CANNOT_FIND_USER = "CANNOT_FIND_USER",
	USERNAME_IS_TOO_AMBIGUOUS = "USERNAME_IS_TOO_AMBIGUOUS"
}
export const enum UsersRegisterErrors {
	USERNAME_EXISTS = "USERNAME_EXISTS",
	PASSWORD_WEAK = "PASSWORD_WEAK",
	INVITE_DOMAIN_INCORRECT = "INVITE_DOMAIN_INCORRECT",
	LINK_EXPIRED = "LINK_EXPIRED",
	USERNAME_INVALID = "USERNAME_INVALID"
}
export const enum UsersChangePasswordWithTokenError {
	CANNOT_CHANGE_PASSWORD_FOR_USER_REGISTERED_VIA_SOCIAL = "CANNOT_CHANGE_PASSWORD_FOR_USER_REGISTERED_VIA_SOCIAL",
	TOKEN_IS_INVALID = "TOKEN_IS_INVALID",
	PASSWORD_IS_TOO_WEAK = "PASSWORD_IS_TOO_WEAK"
}
export const enum UsersJoinToTeamWithInvitationTokenError {
	INVITATION_TOKEN_NOT_FOUND = "INVITATION_TOKEN_NOT_FOUND",
	TEAM_IN_INVITATION_TOKEN_NOT_SPECIFIED = "TEAM_IN_INVITATION_TOKEN_NOT_SPECIFIED",
	MEMBER_ALREADY_EXISTS_IN_THE_TEAM = "MEMBER_ALREADY_EXISTS_IN_THE_TEAM",
	INVITATION_TOKEN_EXPIRED = "INVITATION_TOKEN_EXPIRED"
}
export const enum UsersVerifyEmailError {
	TOKEN_CANNOT_BE_FOUND = "TOKEN_CANNOT_BE_FOUND"
}

type ZEUS_VARIABLES = {
	["UsersProviderErrors"]: ValueTypes["UsersProviderErrors"];
	["UsersGenerateInviteTokenError"]: ValueTypes["UsersGenerateInviteTokenError"];
	["CreateProject"]: ValueTypes["CreateProject"];
	["UsersJoinToTeamError"]: ValueTypes["UsersJoinToTeamError"];
	["UsersInvitationTeamStatus"]: ValueTypes["UsersInvitationTeamStatus"];
	["UsersLoginErrors"]: ValueTypes["UsersLoginErrors"];
	["UsersProviderLoginInput"]: ValueTypes["UsersProviderLoginInput"];
	["UsersInviteTokenInput"]: ValueTypes["UsersInviteTokenInput"];
	["UsersLoginInput"]: ValueTypes["UsersLoginInput"];
	["MailInput"]: ValueTypes["MailInput"];
	["UsersCreateTeamError"]: ValueTypes["UsersCreateTeamError"];
	["UsersSendTeamInvitationInput"]: ValueTypes["UsersSendTeamInvitationInput"];
	["UsersChangePasswordWithTokenInput"]: ValueTypes["UsersChangePasswordWithTokenInput"];
	["UsersRegisterInput"]: ValueTypes["UsersRegisterInput"];
	["UsersSendInvitationToTeamError"]: ValueTypes["UsersSendInvitationToTeamError"];
	["UsersRemoveUserFromTeamInput"]: ValueTypes["UsersRemoveUserFromTeamInput"];
	["UsersGetOAuthInput"]: ValueTypes["UsersGetOAuthInput"];
	["UpdateProject"]: ValueTypes["UpdateProject"];
	["UsersRegisterErrors"]: ValueTypes["UsersRegisterErrors"];
	["UsersChangePasswordWithTokenError"]: ValueTypes["UsersChangePasswordWithTokenError"];
	["UsersJoinToTeamWithInvitationTokenError"]: ValueTypes["UsersJoinToTeamWithInvitationTokenError"];
	["UsersVerifyEmailInput"]: ValueTypes["UsersVerifyEmailInput"];
	["UsersVerifyEmailError"]: ValueTypes["UsersVerifyEmailError"];
}