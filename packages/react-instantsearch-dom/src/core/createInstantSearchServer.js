import React from 'react';
import { renderToString } from 'react-dom/server';
import algoliasearchHelper from 'algoliasearch-helper';
import { version, HIGHLIGHT_TAGS } from 'react-instantsearch-core';

const hasMultipleIndices = context => context && context.multiIndexContext;

const getIndexId = context =>
  hasMultipleIndices(context)
    ? context.multiIndexContext.targetedIndex
    : context.ais.mainTargetedIndex;

const createSearchParametersCollector = accumulator => {
  return (getWidgetSearchParameters, context, props, searchState) => {
    accumulator.push({
      getSearchParameters: getWidgetSearchParameters,
      index: getIndexId(context),
      context,
      props,
      searchState,
    });
  };
};

const getSearchParameters = (indexName, searchParameters) => {
  const sharedParameters = searchParameters
    .filter(searchParameter => !hasMultipleIndices(searchParameter.context))
    .reduce(
      (acc, searchParameter) =>
        searchParameter.getSearchParameters(
          acc,
          searchParameter.props,
          searchParameter.searchState
        ),
      new algoliasearchHelper.SearchParameters({
        ...HIGHLIGHT_TAGS,
        index: indexName,
      })
    );

  const derivedParameters = searchParameters
    .filter(searchParameter => hasMultipleIndices(searchParameter.context))
    .reduce((acc, searchParameter) => {
      const indexId = getIndexId(searchParameter.context);

      return {
        ...acc,
        [indexId]: searchParameter.getSearchParameters(
          acc[indexId] || sharedParameters,
          searchParameter.props,
          searchParameter.searchState
        ),
      };
    }, {});

  return {
    sharedParameters,
    derivedParameters,
  };
};

const singleIndexSearch = (helper, parameters) => helper.searchOnce(parameters);

const multiIndexSearch = (
  indexName,
  client,
  helper,
  sharedParameters,
  { [indexName]: mainParameters, ...derivedParameters }
) => {
  const search = [
    helper.searchOnce({
      ...sharedParameters,
      ...mainParameters,
    }),
  ];

  const indexIds = Object.keys(derivedParameters);

  search.push(
    ...indexIds.map(indexId => {
      const parameters = derivedParameters[indexId];

      return algoliasearchHelper(client, parameters.index).searchOnce(
        parameters
      );
    })
  );

  // We attach `indexId` on the results to be able to reconstruct the object
  // client side. We cannot rely on `state.index` anymore because we may have
  // multiple times the same index.
  return Promise.all(search).then(results =>
    [indexName, ...indexIds].map((indexId, i) => ({
      ...results[i],
      _internalIndexId: indexId,
    }))
  );
};

export const findResultsState = function(App, props) {
  if (!props) {
    throw new Error(
      'The function `findResultsState` must be called with props: `findResultsState(App, props)`'
    );
  }

  if (!props.searchClient) {
    throw new Error(
      'The props provided to `findResultsState` must have a `searchClient`'
    );
  }

  const { indexName, searchClient } = props;

  if (typeof searchClient.addAlgoliaAgent === 'function') {
    searchClient.addAlgoliaAgent(`react (${React.version})`);
    searchClient.addAlgoliaAgent(`react-instantsearch-server (${version})`);
  }

  const searchParameters = [];

  renderToString(
    <App
      {...props}
      onSearchParameters={createSearchParametersCollector(searchParameters)}
    />
  );

  const { sharedParameters, derivedParameters } = getSearchParameters(
    indexName,
    searchParameters
  );

  const helper = algoliasearchHelper(searchClient, sharedParameters.index);

  if (Object.keys(derivedParameters).length === 0) {
    return singleIndexSearch(helper, sharedParameters);
  }

  return multiIndexSearch(
    indexName,
    searchClient,
    helper,
    sharedParameters,
    derivedParameters
  );
};
