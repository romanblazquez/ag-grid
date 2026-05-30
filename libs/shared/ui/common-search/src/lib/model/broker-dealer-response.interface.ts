/** Local Broker interface replacing the proprietary @fmr-pr000539/eqt-ngrx-refdata-services-module */
export interface Broker {
  /** Mock-server field: numeric firm ID */
  firmSourceId?: number;
  /** Mock-server field: full firm name (mapped to longName) */
  firmName?: string;
  /** Mock-server field: firm ticker code (mapped to shortName) */
  firmCode?: string;

  // Legacy / production fields kept for backward compatibility
  id?: string;
  idSrc?: string;
  firmNumber?: number;
  elecPlacementInd?: string | null;
  shortName?: string;
  longName?: string;
  tradeBrokerIndicator?: string;
  statusCode?: string;
  isoCtryCd?: string;
  isoOffInd?: string;
  countryCd?: string;
  countryName?: string;
  taxWithheldRt?: string;
  firmAddDateTime?: string;
  firmUpdateDateTime?: string;
  contacts?: unknown | null;
  affiliatedIndicator?: string;
  parentFirmLongName?: string;
}

export interface BrokerDealerResponse {
  /** Legacy production response key */
  dealer?: Broker[];
  /** Mock-server response key */
  dealers?: Broker[];
}
