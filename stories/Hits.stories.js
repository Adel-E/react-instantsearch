import PropTypes from 'prop-types';
import React from 'react';
import { setAddon, storiesOf } from '@storybook/react';
import {
  Hits,
  Highlight,
  Panel,
  Snippet,
} from '../packages/react-instantsearch/dom';
import { displayName, filterProps, WrapWithHits } from './util';
import JSXAddon from 'storybook-addon-jsx';

setAddon(JSXAddon);

const stories = storiesOf('Hits', module);

stories
  .addWithJSX(
    'default',
    () => (
      <WrapWithHits linkedStoryGroup="Hits">
        <Hits />
      </WrapWithHits>
    ),
    {
      displayName,
      filterProps,
    }
  )
  .add('with custom rendering', () => (
    <WrapWithHits linkedStoryGroup="Hits">
      <Hits hitComponent={Product} />
    </WrapWithHits>
  ))
  .addWithJSX(
    'with Panel',
    () => (
      <WrapWithHits linkedStoryGroup="Hits">
        <Panel header="Hits" footer="Footer">
          <Hits />
        </Panel>
      </WrapWithHits>
    ),
    {
      displayName,
      filterProps,
    }
  );

function Product({ hit }) {
  return (
    <div>
      <Highlight attributeName="name" hit={hit} />
      <p>
        <Highlight attributeName="type" hit={hit} />
      </p>
      <p>
        <Snippet attributeName="description" hit={hit} />
      </p>
    </div>
  );
}

Product.propTypes = {
  hit: PropTypes.object.isRequired,
};
