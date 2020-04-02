import PropTypes from 'prop-types';
import React from 'react';
import { reduxForm } from 'redux-form';
import { bindActionCreators } from 'redux';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import { updateSettings, initiateVerification, createApiKey, removeApiKey } from '../actions';
import AccountForm from '../components/AccountForm';
import { validateSettings } from '../../../utils/reduxFormUtils';
import GithubButton from '../components/GithubButton';
import GoogleButton from '../components/GoogleButton';
import APIKeyForm from '../components/APIKeyForm';
import Nav from '../../../components/Nav';

const __process = (typeof global !== 'undefined' ? global : window).process;
const ROOT_URL = __process.env.API_URL;

function SocialLoginPanel(props) {
  return (
    <React.Fragment>
      <AccountForm {...props} />
      <h2 className="form-container__divider">Social Login</h2>
      <p className="account__social-text">
        Use your GitHub or Google account to log into the p5.js Web Editor.
      </p>
      <GithubButton buttonText="Login with GitHub" />
      <GoogleButton buttonText="Login with Google" />
    </React.Fragment>
  );
}

class AccountView extends React.Component {
  componentDidMount() {
    document.body.className = this.props.theme;
  }

  render() {
    const accessTokensUIEnabled = window.process.env.UI_ACCESS_TOKEN_ENABLED;

    return (
      <div className="account-settings__container">
        <Helmet>
          <title>p5.js Web Editor | Account Settings</title>
        </Helmet>

        <Nav layout="dashboard" />

        <section className="account-settings">
          <header className="account-settings__header">
            <h1 className="account-settings__title">Account Settings</h1>
          </header>
          {accessTokensUIEnabled &&
            <Tabs className="account__tabs">
              <TabList>
                <div className="tabs__titles">
                  <Tab><h4 className="tabs__title">Account</h4></Tab>
                  {accessTokensUIEnabled && <Tab><h4 className="tabs__title">Access Tokens</h4></Tab>}
                </div>
              </TabList>
              <TabPanel>
                <SocialLoginPanel {...this.props} />
              </TabPanel>
              <TabPanel>
                <APIKeyForm {...this.props} />
              </TabPanel>
            </Tabs>
          }
          { !accessTokensUIEnabled && <SocialLoginPanel {...this.props} /> }
        </section>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    initialValues: state.user, // <- initialValues for reduxForm
    previousPath: state.ide.previousPath,
    user: state.user,
    apiKeys: state.user.apiKeys,
    theme: state.preferences.theme
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    updateSettings, initiateVerification, createApiKey, removeApiKey
  }, dispatch);
}

function asyncValidate(formProps, dispatch, props) {
  const fieldToValidate = props.form._active;
  if (fieldToValidate) {
    const queryParams = {};
    queryParams[fieldToValidate] = formProps[fieldToValidate];
    queryParams.check_type = fieldToValidate;
    return axios.get(`${ROOT_URL}/signup/duplicate_check`, { params: queryParams })
      .then((response) => {
        if (response.data.exists) {
          const error = {};
          error[fieldToValidate] = response.data.message;
          throw error;
        }
      });
  }
  return Promise.resolve(true).then(() => {});
}

AccountView.propTypes = {
  previousPath: PropTypes.string.isRequired,
  theme: PropTypes.string.isRequired
};

export default reduxForm({
  form: 'updateAllSettings',
  fields: ['username', 'email', 'currentPassword', 'newPassword'],
  validate: validateSettings,
  asyncValidate,
  asyncBlurFields: ['username', 'email', 'currentPassword']
}, mapStateToProps, mapDispatchToProps)(AccountView);
