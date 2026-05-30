import { BehaviorSubject, Observable, map } from 'rxjs';

export const ICONFIG_BROKER_SERVICE_KEY = 'BROKERDEALER.REST.OAUTH.URL';
export const ICONFIG_CODE_VALUE_SERVICE_KEY = 'CODEVALUE.REST.OAUTH.URL';

const MOCK_API = 'http://localhost:3000/api/';

const _config$ = new BehaviorSubject<Record<string, string>>({
  [ICONFIG_BROKER_SERVICE_KEY]: MOCK_API,
  [ICONFIG_CODE_VALUE_SERVICE_KEY]: MOCK_API,
});

export const getBrokerServiceUrl: Observable<string> = _config$.pipe(
  map((cfg) => cfg[ICONFIG_BROKER_SERVICE_KEY] ?? ''),
);

export const getCodeValueServiceUrl: Observable<string> = _config$.pipe(
  map((cfg) => cfg[ICONFIG_CODE_VALUE_SERVICE_KEY] ?? ''),
);

export function setConfigValues(config: Record<string, string>): void {
  _config$.next(config);
}
