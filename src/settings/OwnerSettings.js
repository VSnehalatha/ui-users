import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import {
  injectIntl,
  FormattedMessage,
} from 'react-intl';
import { Field } from 'react-final-form';
import {
  MultiSelection,
  Label,
} from '@folio/stripes/components';
import { ControlledVocab } from '@folio/stripes/smart-components';
import { stripesConnect, withStripes } from '@folio/stripes/core';

import { validate } from '../components/util';
import { SHARED_OWNER } from '../constants';

const columnMapping = (formatMessage) => ({
  owner: (
    <Label
      tagName="span"
      required
    >
      <FormattedMessage id="ui-users.owners.columns.owner" />
    </Label>
  ),
  desc: formatMessage({ id: 'ui-users.owners.columns.desc' }),
  servicePointOwner: (
    <Label id="associated-service-point-label">
      <FormattedMessage id="ui-users.owners.columns.asp" />
    </Label>
  ),
});

class OwnerSettings extends React.Component {
  static manifest = Object.freeze({
    ownerServicePoints: {
      type: 'okapi',
      resource: 'service-points',
      path: 'service-points?limit=200',
    },
    owners: {
      type: 'okapi',
      records: 'owners',
      path: 'owners',
      GET: {
        path: 'owners?query=cql.allRecords=1 sortby owner&limit=2000'
      }
    },
  });

  static propTypes = {
    stripes: PropTypes.shape({
      connect: PropTypes.func.isRequired,
    }).isRequired,
    resources: PropTypes.object,
    intl: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.connectedControlledVocab = props.stripes.connect(ControlledVocab);
  }

  validateItem = (item, index, items) => {
    const { intl: { formatMessage } } = this.props;
    const label = formatMessage({ id: 'ui-users.owners.singular' });
    const itemErrors = validate(item, index, items, 'owner', label);
    const evaluateServicePoint = item.servicePointOwner ? item.servicePointOwner.length : 0;
    if (item.owner === SHARED_OWNER && evaluateServicePoint > 0) {
      itemErrors.owner = formatMessage({ id: 'ui-users.owners.noServicePoints' });
    }
    return itemErrors;
  }

  warn = ({ items }) => {
    const servicePoints = _.get(this.props.resources, ['ownerServicePoints', 'records', 0, 'servicepoints'], []);
    const none = servicePoints.find(s => s.name === 'None') || {};

    const warnings = [];
    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        const itemWarning = {};

        const asp = item.servicePointOwner || [];

        asp.forEach(s => {
          if (s.value === none.id) {
            itemWarning.servicePointOwner = <FormattedMessage id="ui-users.owners.warning" />;
          }
        });

        if (Object.keys(itemWarning).length) {
          warnings[index] = itemWarning;
        }
      });
    }
    return { items: warnings };
  }

  render() {
    const {
      intl: { formatMessage },
      resources
    } = this.props;
    const label = formatMessage({ id: 'ui-users.owners.singular' });

    const rows = _.get(resources, ['owners', 'records'], []);
    const servicePoints = _.get(resources, ['ownerServicePoints', 'records', 0, 'servicepoints'], []);
    const serviceOwners = [];
    rows.forEach(o => {
      const asp = o.servicePointOwner || [];
      asp.forEach(s => {
        if (!serviceOwners.includes(s.value)) {
          serviceOwners.push(s.value);
        }
      });
    });
    const options = [];
    servicePoints.forEach(s => {
      if (!serviceOwners.includes(s.id) || s.name === 'None') {
        options.push({ value: s.id, label: s.name });
      }
    });

    const fieldComponents = {
      'servicePointOwner': ({ fieldProps }) => (
        <Field
          {...fieldProps}
          id="owner-service-point"
          component={MultiSelection}
          aria-labelledby="associated-service-point-label"
          dataOptions={options}
          renderToOverlay
          marginBottom0
          validationEnabled
          onBlur={e => e.preventDefault()}
        />
      )
    };

    const formatter = {
      'servicePointOwner': (value) => {
        const asp = value.servicePointOwner || [];
        const items = asp.map(a => <li key={a.label}>{a.label}</li>);
        return <ul className="marginBottom0">{items}</ul>;
      }
    };

    return (
      <this.connectedControlledVocab
        {...this.props}
        baseUrl="owners"
        columnMapping={columnMapping(formatMessage)}
        fieldComponents={fieldComponents}
        formatter={formatter}
        hiddenFields={['lastUpdated', 'numberOfObjects']}
        id="settings-owners"
        label={formatMessage({ id: 'ui-users.owners.label' })}
        labelSingular={label}
        nameKey="owner"
        objectLabel=""
        records="owners"
        sortby="owner"
        validate={this.validateItem}
        visibleFields={['owner', 'desc', 'servicePointOwner']}
        warn={this.warn}
        formType="final-form"
      />
    );
  }
}

export default injectIntl(withStripes(stripesConnect(OwnerSettings)));
