import React from 'react';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { SearchParameters, SearchResults } from 'algoliasearch-helper';
import {
  createIndex,
  createInstantSearch,
  createConnector,
  version,
} from 'react-instantsearch-core';
import { findResultsState } from '../createInstantSearchServer';

Enzyme.configure({ adapter: new Adapter() });

describe('findResultsState', () => {
  const createSearchClient = () => ({
    search: () =>
      Promise.resolve({
        results: [{ query: 'query' }],
      }),
  });

  const InstantSearch = createInstantSearch({ Root: 'div' });

  const createWidget = ({ getSearchParameters = () => {} } = {}) =>
    createConnector({
      displayName: 'CoolConnector',
      getProvidedProps: () => null,
      getSearchParameters(searchParameters, props, searchState) {
        getSearchParameters();

        const fallback = props.defaultRefinement || 'Apple';

        if (this.props.indexContextValue) {
          const index = this.props.indexContextValue.targetedIndex;
          const indexSearchState =
            searchState.indices && searchState.indices[index]
              ? searchState.indices[index]
              : {};

          return searchParameters.setQuery(indexSearchState.query || fallback);
        }

        return searchParameters.setQuery(searchState.query || fallback);
      },
      getMetadata: () => null,
      getId: () => 'id',
    })(() => null);

  const requiredProps = {
    indexName: 'indexName',
  };

  const requiredPropsWithSearchClient = {
    ...requiredProps,
    searchClient: createSearchClient(),
  };

  it('throws an error if props are not provided', () => {
    const App = props => <InstantSearch {...props} />;

    const trigger = () => findResultsState(App);

    expect(() => trigger()).toThrowErrorMatchingInlineSnapshot(
      `"The function \`findResultsState\` must be called with props: \`findResultsState(App, props)\`"`
    );
  });

  it('throws an error if props does not have a `searchClient`', () => {
    const App = props => <InstantSearch {...props} />;

    const props = {
      ...requiredProps,
    };

    const trigger = () => findResultsState(App, props);

    expect(() => trigger()).toThrowErrorMatchingInlineSnapshot(
      `"The props provided to \`findResultsState\` must have a \`searchClient\`"`
    );
  });

  it('adds expected Algolia agents', () => {
    const App = props => <InstantSearch {...props} />;

    const searchClient = {
      ...createSearchClient(),
      addAlgoliaAgent: jest.fn(),
    };

    const props = {
      ...requiredProps,
      searchClient,
    };

    findResultsState(App, props);

    // The `addAlgoliaAgent` method is called 8 times:
    // - 2 times with react-instantsearch-dom/server
    // - 2 times with react-instantsearch-dom
    // - 4 times with the AlgoliasearchHelper (it is created two times at the moment)
    // Note that with the changes for "modern" React it might not be the case anymore.

    expect(searchClient.addAlgoliaAgent).toHaveBeenCalledTimes(8);
    expect(searchClient.addAlgoliaAgent).toHaveBeenCalledWith(
      `react (${React.version})`
    );
    expect(searchClient.addAlgoliaAgent).toHaveBeenCalledWith(
      `react-instantsearch-server (${version})`
    );
  });

  it('does not throw if `searchClient` does not have a `addAlgoliaAgent()` method', () => {
    const App = props => <InstantSearch {...props} />;

    const props = {
      ...requiredProps,
      searchClient: createSearchClient(),
    };

    const trigger = () => findResultsState(App, props);

    expect(() => trigger()).not.toThrow();
  });

  describe('single index', () => {
    it('results should be instance of SearchResults and SearchParameters', async () => {
      const getSearchParameters = jest.fn();
      const Connected = createWidget({
        getSearchParameters,
      });

      const App = props => (
        <InstantSearch {...props}>
          <Connected />
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
      };

      const results = await findResultsState(App, props);

      expect(results.content).toBeInstanceOf(SearchResults);
      expect(results.state).toBeInstanceOf(SearchParameters);
    });

    it('searchParameters should be cleaned each time', async () => {
      const getSearchParameters = jest.fn();
      const Connected = createWidget({
        getSearchParameters,
      });

      const App = props => (
        <InstantSearch {...props}>
          <Connected />
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
      };

      await findResultsState(App, props);

      expect(getSearchParameters).toHaveBeenCalledTimes(1);

      getSearchParameters.mockClear();

      await findResultsState(App, props);

      expect(getSearchParameters).toHaveBeenCalledTimes(1);
    });

    it('without search state', async () => {
      const Connected = createWidget();

      const App = props => (
        <InstantSearch {...props}>
          <Connected />
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
      };

      const data = await findResultsState(App, props);

      expect(data._originalResponse).toBeDefined();
      expect(data.content).toBeDefined();
      expect(data.state.index).toBe('indexName');
      expect(data.state.query).toBe('Apple');
    });

    it('with search state', async () => {
      const Connected = createWidget();

      const App = props => (
        <InstantSearch {...props}>
          <Connected />
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
        searchState: {
          query: 'iPhone',
        },
      };

      const data = await findResultsState(App, props);

      expect(data._originalResponse).toBeDefined();
      expect(data.content).toBeDefined();
      expect(data.state.index).toBe('indexName');
      expect(data.state.query).toBe('iPhone');
    });
  });

  describe('multi index', () => {
    const Index = createIndex({ Root: 'div' });

    it('results should be instance of SearchResults and SearchParameters', async () => {
      const getSearchParameters = jest.fn();
      const Connected = createWidget({
        getSearchParameters,
      });

      const App = props => (
        <InstantSearch {...props}>
          <Index indexName="index2">
            <Connected />
          </Index>
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
      };

      const results = await findResultsState(App, props);

      results.forEach(result => {
        expect(result.content).toBeInstanceOf(SearchResults);
        expect(result.state).toBeInstanceOf(SearchParameters);
      });
    });

    it('searchParameters should be cleaned each time', async () => {
      const getSearchParameters = jest.fn();
      const Connected = createWidget({
        getSearchParameters,
      });

      const App = props => (
        <InstantSearch {...props}>
          <Index indexName="index2">
            <Connected />
          </Index>
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
      };

      await findResultsState(App, props);

      expect(getSearchParameters).toHaveBeenCalledTimes(1);

      getSearchParameters.mockClear();

      await findResultsState(App, props);

      expect(getSearchParameters).toHaveBeenCalledTimes(1);
    });

    it('without search state - first API', async () => {
      const Connected = createWidget();
      const App = props => (
        <InstantSearch {...props}>
          <Index indexId="index1" indexName="index1">
            <Connected />
          </Index>

          <Index indexId="index2" indexName="index2">
            <Connected />
          </Index>
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
        indexName: 'index1',
      };

      const data = await findResultsState(App, props);

      expect(data).toHaveLength(2);

      const [first] = data;

      expect(first._internalIndexId).toBe('index1');
      expect(first.state.index).toBe('index1');
      expect(first.state.query).toBe('Apple');

      const [, second] = data;

      expect(second._internalIndexId).toBe('index2');
      expect(second.state.index).toBe('index2');
      expect(second.state.query).toBe('Apple');
    });

    it('without search state - second API', async () => {
      const Connected = createWidget();
      const App = props => (
        <InstantSearch {...props}>
          <Connected />

          <Index indexId="index2" indexName="index2">
            <Connected />
          </Index>
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
        indexName: 'index1',
      };

      const data = await findResultsState(App, props);

      expect(data).toHaveLength(2);

      const [first] = data;

      expect(first._internalIndexId).toBe('index1');
      expect(first.state.index).toBe('index1');
      expect(first.state.query).toBe('Apple');

      const [, second] = data;

      expect(second._internalIndexId).toBe('index2');
      expect(second.state.index).toBe('index2');
      expect(second.state.query).toBe('Apple');
    });

    it('without search state - same index', async () => {
      const Connected = createWidget();
      const App = props => (
        <InstantSearch {...props}>
          <Connected defaultRefinement="Apple" />

          <Index indexId="index1_with_refinement" indexName="index1">
            <Connected defaultRefinement="iWatch" />
          </Index>
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
        indexName: 'index1',
      };

      const data = await findResultsState(App, props);

      expect(data).toHaveLength(2);

      const [first] = data;

      expect(first._internalIndexId).toBe('index1');
      expect(first.state.index).toBe('index1');
      expect(first.state.query).toBe('Apple');

      const [, second] = data;

      expect(second._internalIndexId).toBe('index1_with_refinement');
      expect(second.state.index).toBe('index1');
      expect(second.state.query).toBe('iWatch');
    });

    it('with search state - first API', async () => {
      const Connected = createWidget();
      const App = props => (
        <InstantSearch {...props}>
          <Index indexId="index1" indexName="index1">
            <Connected />
          </Index>

          <Index indexId="index2" indexName="index2">
            <Connected />
          </Index>
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
        indexName: 'index1',
        searchState: {
          indices: {
            index1: {
              query: 'iPhone',
            },
            index2: {
              query: 'iPad',
            },
          },
        },
      };

      const data = await findResultsState(App, props);

      expect(data).toHaveLength(2);

      const [first] = data;

      expect(first._internalIndexId).toBe('index1');
      expect(first.state.index).toBe('index1');
      expect(first.state.query).toBe('iPhone');

      const [, second] = data;

      expect(second._internalIndexId).toBe('index2');
      expect(second.state.index).toBe('index2');
      expect(second.state.query).toBe('iPad');
    });

    it('with search state - second API', async () => {
      const Connected = createWidget();
      const App = props => (
        <InstantSearch {...props}>
          <Connected />

          <Index indexId="index2" indexName="index2">
            <Connected />
          </Index>
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
        indexName: 'index1',
        searchState: {
          query: 'iPhone',
          indices: {
            index2: {
              query: 'iPad',
            },
          },
        },
      };

      const data = await findResultsState(App, props);

      expect(data).toHaveLength(2);

      const [first] = data;

      expect(first._internalIndexId).toBe('index1');
      expect(first.state.index).toBe('index1');
      expect(first.state.query).toBe('iPhone');

      const [, second] = data;

      expect(second._internalIndexId).toBe('index2');
      expect(second.state.index).toBe('index2');
      expect(second.state.query).toBe('iPad');
    });

    it('with search state - same index', async () => {
      const Connected = createWidget();
      const App = props => (
        <InstantSearch {...props}>
          <Connected />

          <Index indexId="index1_with_refinement" indexName="index1">
            <Connected />
          </Index>
        </InstantSearch>
      );

      const props = {
        ...requiredPropsWithSearchClient,
        indexName: 'index1',
        searchState: {
          query: 'iPhone',
          indices: {
            // eslint-disable-next-line camelcase
            index1_with_refinement: {
              query: 'iPad',
            },
          },
        },
      };

      const data = await findResultsState(App, props);

      expect(data).toHaveLength(2);

      const [first] = data;

      expect(first._internalIndexId).toBe('index1');
      expect(first.state.index).toBe('index1');
      expect(first.state.query).toBe('iPhone');

      const [, second] = data;

      expect(second._internalIndexId).toBe('index1_with_refinement');
      expect(second.state.index).toBe('index1');
      expect(second.state.query).toBe('iPad');
    });
  });
});
