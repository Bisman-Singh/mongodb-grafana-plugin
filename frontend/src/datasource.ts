import { FetchResponse, getBackendSrv } from '@grafana/runtime';
import {
  CoreApp,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
} from '@grafana/data';
import {
  MyQuery,
  MyDataSourceOptions,
  TimeSeriesResponse,
  TableResponse,
  ConnectionResponse,
  QueryType,
} from './types';
import { lastValueFrom } from 'rxjs';

interface PluginConfigs {
  url: string;
  db: string;
}

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  baseUrl: string;
  db: PluginConfigs;

  constructor(
    instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>,
  ) {
    super(instanceSettings);
    this.baseUrl = instanceSettings.jsonData.backendUri;
    this.db = {
      url: instanceSettings.jsonData.mongoConnString,
      db: instanceSettings.jsonData.databaseName,
    };
  }

  getDefaultQuery(_: CoreApp): Partial<MyQuery> {
    return {
      queryText: '',
      queryType: QueryType.timeserie,
    };
  }

  filterQuery(query: MyQuery): boolean {
    // if no query has been provided, prevent the query from being executed
    return !!query.queryText;
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    try {
      const payload = {
        ...options,
        db: { ...this.db },
        targets: options.targets.filter((target) => !!target.queryType),
      };
      const response = (await this.request('/query', payload)) as FetchResponse<
        TimeSeriesResponse[] | TableResponse[]
      >;
      return { data: response.data };
    } catch (err: any) {
      return { data: [], error: { message: err?.message ?? err } };
    }
  }

  async request(
    url: string,
    body: object,
  ): Promise<
    FetchResponse<TimeSeriesResponse[] | TableResponse[] | ConnectionResponse>
  > {
    const response = getBackendSrv().fetch<
      TimeSeriesResponse[] | TableResponse[] | ConnectionResponse
    >({
      url: `${this.baseUrl}${url}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(body),
    });
    return lastValueFrom(response);
  }

  /**
   * Checks whether we can connect to the API.
   */
  async testDatasource() {
    try {
      const response = (await this.request('/', {
        db: this.db,
      })) as FetchResponse<ConnectionResponse>;
      if (response.status === 200) {
        return {
          status: 'success',
          message: 'Success',
        };
      } else {
        return {
          status: 'error',
          message: response.data.message ?? 'unknown',
        };
      }
    } catch (err: any) {
      return {
        status: 'error',
        message: err?.message ?? err,
      };
    }
  }
}
