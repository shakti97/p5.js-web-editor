import PropTypes from 'prop-types';
import React from 'react';
import { Helmet } from 'react-helmet';
import InlineSVG from 'react-inlinesvg';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import classNames from 'classnames';
import find from 'lodash/find';
import * as ProjectActions from '../../actions/project';
import * as ProjectsActions from '../../actions/projects';
import * as CollectionsActions from '../../actions/collections';
import * as ToastActions from '../../actions/toast';
import * as SortingActions from '../../actions/sorting';
import getSortedCollections from '../../selectors/collections';
import Loader from '../../../App/components/loader';
import Overlay from '../../../App/components/Overlay';
import AddToCollectionSketchList from '../AddToCollectionSketchList';
import { SketchSearchbar } from '../Searchbar';

import CollectionListRow from './CollectionListRow';

const arrowUp = require('../../../../images/sort-arrow-up.svg');
const arrowDown = require('../../../../images/sort-arrow-down.svg');

class CollectionList extends React.Component {
  constructor(props) {
    super(props);

    if (props.projectId) {
      props.getProject(props.projectId);
    }

    this.props.getCollections(this.props.username);
    this.props.resetSorting();

    this.state = {
      hasLoadedData: false,
      addingSketchesToCollectionId: null,
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.loading === true && this.props.loading === false) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        hasLoadedData: true,
      });
    }
  }

  getTitle() {
    if (this.props.username === this.props.user.username) {
      return 'p5.js Web Editor | My collections';
    }
    return `p5.js Web Editor | ${this.props.username}'s collections`;
  }

  showAddSketches = (collectionId) => {
    this.setState({
      addingSketchesToCollectionId: collectionId,
    });
  }

  hideAddSketches = () => {
    this.setState({
      addingSketchesToCollectionId: null,
    });
  }

  hasCollections() {
    return (!this.props.loading || this.state.hasLoadedData) && this.props.collections.length > 0;
  }

  _renderLoader() {
    if (this.props.loading && !this.state.hasLoadedData) return <Loader />;
    return null;
  }

  _renderEmptyTable() {
    if (!this.props.loading && this.props.collections.length === 0) {
      return (<p className="sketches-table__empty">No collections.</p>);
    }
    return null;
  }

  _renderFieldHeader = (fieldName, displayName) => {
    const { field, direction } = this.props.sorting;
    const headerClass = classNames({
      'sketches-table__header': true,
      'sketches-table__header--selected': field === fieldName
    });
    return (
      <th scope="col">
        <button className="sketch-list__sort-button" onClick={() => this.props.toggleDirectionForField(fieldName)}>
          <span className={headerClass}>{displayName}</span>
          {field === fieldName && direction === SortingActions.DIRECTION.ASC &&
            <InlineSVG src={arrowUp} />
          }
          {field === fieldName && direction === SortingActions.DIRECTION.DESC &&
            <InlineSVG src={arrowDown} />
          }
        </button>
      </th>
    );
  }

  render() {
    const username = this.props.username !== undefined ? this.props.username : this.props.user.username;

    return (
      <div className="sketches-table-container">
        <Helmet>
          <title>{this.getTitle()}</title>
        </Helmet>

        {this._renderLoader()}
        {this._renderEmptyTable()}
        {this.hasCollections() &&
          <table className="sketches-table" summary="table containing all collections">
            <thead>
              <tr>
                {this._renderFieldHeader('name', 'Name')}
                {this._renderFieldHeader('createdAt', 'Date Created')}
                {this._renderFieldHeader('updatedAt', 'Date Updated')}
                {this._renderFieldHeader('numItems', '# sketches')}
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {this.props.collections.map(collection =>
                (<CollectionListRow
                  key={collection.id}
                  collection={collection}
                  user={this.props.user}
                  username={username}
                  project={this.props.project}
                  onAddSketches={() => this.showAddSketches(collection.id)}
                />))}
            </tbody>
          </table>}
        {
          this.state.addingSketchesToCollectionId && (
            <Overlay
              title="Add sketch"
              actions={<SketchSearchbar />}
              closeOverlay={this.hideAddSketches}
              isFixedHeight
            >
              <div className="collection-add-sketch">
                <AddToCollectionSketchList
                  username={this.props.username}
                  collection={find(this.props.collections, { id: this.state.addingSketchesToCollectionId })}
                />
              </div>
            </Overlay>
          )
        }
      </div>
    );
  }
}

CollectionList.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string,
    authenticated: PropTypes.bool.isRequired
  }).isRequired,
  projectId: PropTypes.string,
  getCollections: PropTypes.func.isRequired,
  getProject: PropTypes.func.isRequired,
  collections: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
    updatedAt: PropTypes.string.isRequired,
  })).isRequired,
  username: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  toggleDirectionForField: PropTypes.func.isRequired,
  resetSorting: PropTypes.func.isRequired,
  sorting: PropTypes.shape({
    field: PropTypes.string.isRequired,
    direction: PropTypes.string.isRequired
  }).isRequired,
  project: PropTypes.shape({
    id: PropTypes.string,
    owner: PropTypes.shape({
      id: PropTypes.string
    })
  })
};

CollectionList.defaultProps = {
  projectId: undefined,
  project: {
    id: undefined,
    owner: undefined
  },
  username: undefined
};

function mapStateToProps(state, ownProps) {
  return {
    user: state.user,
    collections: getSortedCollections(state),
    sorting: state.sorting,
    loading: state.loading,
    project: state.project,
    projectId: ownProps && ownProps.params ? ownProps.params.project_id : null,
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    Object.assign({}, CollectionsActions, ProjectsActions, ProjectActions, ToastActions, SortingActions),
    dispatch
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(CollectionList);
