import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { urlBase } from '../config';
import {
  createApplicationHubConnection,
  createMetricsHubConnection,
} from '../lib/hubFactory';
import * as relayAPI from '../lib/relay';
import { connect, disconnect } from '../lib/server';
import * as session from '../lib/session';
import { isPassthroughEnabled } from '../lib/token';
import { formatBytes } from '../lib/util';
import AppContext from './AppContext';
import Browse from './Browse/Browse';
import Chat from './Chat/Chat';
import Dashboard from './Dashboard/Dashboard';
import LoginForm from './LoginForm';
import Rooms from './Rooms/Rooms';
import Searches from './Search/Searches';
import ErrorSegment from './Shared/ErrorSegment';
import System from './System/System';
import Transfers from './Transfers/Transfers';
import Users from './Users/Users';
import React, { Component } from 'react';
import { Link, Redirect, Route, Switch } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { Button, Header, Icon, Loader, Modal } from 'semantic-ui-react';

const initialState = {
  applicationOptions: {},
  applicationState: {},
  error: false,
  initialized: false,
  login: {
    error: undefined,
    pending: false,
  },
  retriesExhausted: false,
  transferMetrics: {},
};

// Format bytes/sec for display in the sidebar status
const fmtSpeed = (bps) => {
  if (!bps || bps < 1) return '0 B/s';
  return `${formatBytes(bps, 1, 4, ' ')}/s`;
};

// A sidebar nav link that highlights when the current route matches
const NavLink = ({ badge, icon, label, to }) => {
  const active = window.location.pathname.startsWith(to);
  return (
    <Link
      className={`app-nav-link${active ? ' active' : ''}`}
      to={to}
    >
      <Icon name={icon} />
      <span className="app-nav-link-label">{label}</span>
      {badge != null && <span className="app-nav-badge">{badge}</span>}
    </Link>
  );
};

class App extends Component {
  constructor(props) {
    super(props);

    this.state = initialState;
    this.hubConnections = {};
  }

  componentDidMount() {
    if (this.getSavedTheme() == null) {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener(
          'change',
          (event) => event.matches && this.setState({ theme: 'dark' }),
        );
      window
        .matchMedia('(prefers-color-scheme: light)')
        .addEventListener(
          'change',
          (event) => event.matches && this.setState({ theme: 'light' }),
        );
    }

    this.init();
  }

  init = async () => {
    this.setState({ initialized: false }, async () => {
      try {
        const securityEnabled = await session.getSecurityEnabled();

        if (!securityEnabled) {
          console.debug('application security is not enabled, per api call');
          session.enablePassthrough();
        }

        if (await session.check()) {
          const appHub = createApplicationHubConnection();

          appHub.on('state', (state) => {
            this.setState({ applicationState: state });
          });

          appHub.on('options', (options) => {
            this.setState({ applicationOptions: options });
          });

          appHub.onreconnecting(() =>
            this.setState({ error: true, retriesExhausted: false }),
          );
          appHub.onclose(() =>
            this.setState({ error: true, retriesExhausted: true }),
          );
          appHub.onreconnected(() =>
            this.setState({ error: false, retriesExhausted: false }),
          );

          await this.hubConnections.appHub?.stop();
          this.hubConnections.appHub = appHub;
          await appHub.start();

          const metricsHub = createMetricsHubConnection();

          metricsHub.on('Update', (metrics) => {
            this.setState({ transferMetrics: metrics });
          });

          await this.hubConnections.metricsHub?.stop();
          this.hubConnections.metricsHub = metricsHub;
          await metricsHub.start();
        }

        const savedTheme = this.getSavedTheme();
        if (savedTheme != null) {
          this.setState({ theme: savedTheme });
        }

        this.setState({
          error: false,
        });
      } catch (error) {
        console.error(error);
        this.setState({ error: true, retriesExhausted: true });
      } finally {
        this.setState({ initialized: true });
      }
    });
  };

  getSavedTheme = () => {
    return localStorage.getItem('slskd-theme');
  };

  toggleTheme = () => {
    this.setState((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('slskd-theme', newTheme);
      return { theme: newTheme };
    });
  };

  handleLogin = (username, password, rememberMe) => {
    this.setState(
      (previousState) => ({
        login: { ...previousState.login, error: undefined, pending: true },
      }),
      async () => {
        try {
          await session.login({ password, rememberMe, username });
          this.setState(
            (previousState) => ({
              login: { ...previousState.login, error: false, pending: false },
            }),
            () => this.init(),
          );
        } catch (error) {
          this.setState((previousState) => ({
            login: { ...previousState.login, error, pending: false },
          }));
        }
      },
    );
  };

  logout = () => {
    session.logout();

    this.hubConnections?.appHub?.stop();
    this.hubConnections?.metricsHub?.stop();

    this.setState({ login: { ...initialState.login } });
  };

  withTokenCheck = (component) => {
    session.check(); // async, runs in the background
    return { ...component };
  };

  // eslint-disable-next-line complexity
  render() {
    const {
      applicationOptions = {},
      applicationState = {},
      error,
      initialized,
      login,
      retriesExhausted,
      theme = this.getSavedTheme() ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'),
      transferMetrics = {},
    } = this.state;
    const {
      connectionWatchdog = {},
      pendingReconnect,
      pendingRestart,
      relay = {},
      server,
      shares = {},
      user,
      version = {},
    } = applicationState;
    const { current, isUpdateAvailable, latest } = version;
    const { scanPending: pendingShareRescan } = shares;

    const { controller, mode } = relay;

    if (!initialized) {
      return (
        <Loader
          active
          size="big"
        />
      );
    }

    if (error) {
      return (
        <ErrorSegment
          caption={
            <>
              <span>Lost connection to slskd</span>
              <br />
              <span>
                {retriesExhausted ? 'Refresh to reconnect' : 'Retrying...'}
              </span>
            </>
          }
          icon="attention"
          suppressPrefix
        />
      );
    }

    if (!session.isLoggedIn() && !isPassthroughEnabled()) {
      return (
        <LoginForm
          error={login.error}
          initialized={login.initialized}
          loading={login.pending}
          onLoginAttempt={this.handleLogin}
        />
      );
    }

    const isAgent = mode === 'Agent';

    if (theme === 'dark') {
      document.documentElement.classList.add(theme);
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Derive connection status info for sidebar
    const downloadSpeed = transferMetrics?.downloads?.inProgress?.averageSpeed;
    const downloadActive = transferMetrics?.downloads?.inProgress?.files ?? 0;
    const downloadQueued = transferMetrics?.downloads?.queued?.files ?? 0;
    const uploadSpeed = transferMetrics?.uploads?.inProgress?.averageSpeed;
    const uploadActive = transferMetrics?.uploads?.inProgress?.files ?? 0;
    const uploadQueued = transferMetrics?.uploads?.queued?.files ?? 0;

    let connDotClass = 'app-sidebar-status-dot--red';
    let connLabel = 'Disconnected';
    if (server?.isConnected) {
      connDotClass = pendingReconnect
        ? 'app-sidebar-status-dot--yellow'
        : 'app-sidebar-status-dot--green';
      connLabel = user?.username ?? 'Connected';
    } else if (
      connectionWatchdog?.isAttemptingConnection ||
      server?.isConnecting
    ) {
      connDotClass = 'app-sidebar-status-dot--yellow';
      connLabel = 'Connecting…';
    }

    return (
      <>
        {/* ── Left Sidebar ── */}
        <nav className="app-sidebar">
          {/* Brand */}
          <div className="app-sidebar-brand">
            <img
              alt="slskd"
              className="app-sidebar-brand-logo"
              src="/favicon.ico"
            />
            <span className="app-sidebar-brand-name">slskd</span>
          </div>

          {/* Canary / Agent banners */}
          {version.isCanary && (
            <div className="canary-banner">🧪 Canary Build</div>
          )}

          {/* Nav items */}
          <div className="app-sidebar-nav">
            {isAgent ? (
              <div className="app-nav-link">
                <Icon name="detective" />
                <span className="app-nav-link-label">Agent Mode</span>
              </div>
            ) : (
              <>
                <NavLink
                  icon="chart bar"
                  label="Dashboard"
                  to={`${urlBase}/dashboard`}
                />
                <NavLink
                  icon="search"
                  label="Search"
                  to={`${urlBase}/searches`}
                />
                <div className="app-nav-section-label">Transfers</div>
                <NavLink
                  icon="download"
                  label="Downloads"
                  to={`${urlBase}/downloads`}
                />
                <NavLink
                  icon="upload"
                  label="Uploads"
                  to={`${urlBase}/uploads`}
                />
                <div className="app-nav-section-label">Social</div>
                <NavLink
                  icon="comments"
                  label="Rooms"
                  to={`${urlBase}/rooms`}
                />
                <NavLink
                  icon="comment"
                  label="Chat"
                  to={`${urlBase}/chat`}
                />
                <NavLink
                  icon="users"
                  label="Users"
                  to={`${urlBase}/users`}
                />
                <NavLink
                  icon="folder open"
                  label="Browse"
                  to={`${urlBase}/browse`}
                />
              </>
            )}
          </div>

          {/* Sidebar footer: status, speeds, actions */}
          <div className="app-sidebar-footer">
            {/* Connection status */}
            <div className="app-sidebar-status">
              <span className={`app-sidebar-status-dot ${connDotClass}`} />
              <span>{connLabel}</span>
            </div>

            {/* Transfer speeds */}
            {server?.isConnected && (
              <div className="app-sidebar-speeds">
                <div className="app-sidebar-speed-row">
                  <Icon
                    color="blue"
                    name="arrow down"
                    style={{ margin: 0 }}
                  />
                  <span className="app-sidebar-speed-value">
                    {fmtSpeed(downloadSpeed)}
                  </span>
                  <span>
                    {downloadActive}↓ · {downloadQueued}Q
                  </span>
                </div>
                <div className="app-sidebar-speed-row">
                  <Icon
                    color="green"
                    name="arrow up"
                    style={{ margin: 0 }}
                  />
                  <span className="app-sidebar-speed-value">
                    {fmtSpeed(uploadSpeed)}
                  </span>
                  <span>
                    {uploadActive}↑ · {uploadQueued}Q
                  </span>
                </div>
              </div>
            )}

            {/* Actions row */}
            <NavLink
              icon="cogs"
              label="System"
              to={`${urlBase}/system`}
            />

            {/* Theme toggle */}
            <button
              className="app-nav-link"
              onClick={() => this.toggleTheme()}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
              }}
              type="button"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
              <span className="app-nav-link-label">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>

            {/* Connect / Disconnect */}
            {mode === 'Agent' ? (
              <button
                className="app-nav-link"
                onClick={() =>
                  controller?.state === 'Connected'
                    ? relayAPI.disconnect()
                    : relayAPI.connect()
                }
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
                type="button"
              >
                <Icon name="plug" />
                <span className="app-nav-link-label">
                  Controller {controller?.state}
                </span>
              </button>
            ) : server?.isConnected ? (
              <button
                className="app-nav-link"
                onClick={() => disconnect()}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
                type="button"
              >
                <Icon
                  color="green"
                  name="plug"
                />
                <span className="app-nav-link-label">Disconnect</span>
              </button>
            ) : (
              <button
                className="app-nav-link"
                onClick={() => connect()}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
                type="button"
              >
                <Icon
                  color="red"
                  name="plug"
                />
                <span className="app-nav-link-label">Connect</span>
              </button>
            )}

            {/* Pending action warning */}
            {(pendingReconnect || pendingRestart || pendingShareRescan) && (
              <Link
                className="app-nav-link"
                to={`${urlBase}/system/info`}
              >
                <Icon
                  color="yellow"
                  name="exclamation circle"
                />
                <span className="app-nav-link-label">Pending Action</span>
              </Link>
            )}

            {/* Update available */}
            {isUpdateAvailable && (
              <Modal
                centered
                closeIcon
                size="mini"
                trigger={
                  <div
                    className="app-nav-link"
                    style={{ cursor: 'pointer' }}
                  >
                    <Icon
                      color="yellow"
                      name="bullhorn"
                    />
                    <span className="app-nav-link-label">New Version!</span>
                  </div>
                }
              >
                <Modal.Header>New Version!</Modal.Header>
                <Modal.Content>
                  <p>
                    You are running <strong>{current}</strong> — version{' '}
                    <strong>{latest}</strong> is available.
                  </p>
                </Modal.Content>
                <Modal.Actions>
                  <Button
                    fluid
                    href="https://github.com/slskd/slskd/releases"
                    primary
                    style={{ marginLeft: 0 }}
                  >
                    See Release Notes
                  </Button>
                </Modal.Actions>
              </Modal>
            )}

            {/* Logout */}
            {session.isLoggedIn() && (
              <Modal
                actions={[
                  'Cancel',
                  {
                    content: 'Log Out',
                    key: 'done',
                    negative: true,
                    onClick: this.logout,
                  },
                ]}
                centered
                content="Are you sure you want to log out?"
                header={
                  <Header
                    content="Confirm Log Out"
                    icon="sign-out"
                  />
                }
                size="mini"
                trigger={
                  <div
                    className="app-nav-link"
                    style={{ cursor: 'pointer' }}
                  >
                    <Icon name="sign-out" />
                    <span className="app-nav-link-label">Log Out</span>
                  </div>
                }
              />
            )}

            {/* Version */}
            <div
              className="app-sidebar-status"
              style={{ fontSize: '0.72rem', opacity: 0.4 }}
            >
              <img
                alt=""
                src="/favicon.ico"
                style={{ width: 12, height: 12 }}
              />
              <span>v{version.current} · AGPLv3</span>
            </div>
          </div>
        </nav>

        {/* ── Main Content ── */}
        <div className="app-content">
          <div className="app-content-body">
            <AppContext.Provider
              // eslint-disable-next-line no-warning-comments
              // TODO: needs useMemo, but class component. yolo for now.
              // eslint-disable-next-line react/jsx-no-constructed-context-values
              value={{ options: applicationOptions, state: applicationState }}
            >
              {isAgent ? (
                <Switch>
                  <Route
                    path={`${urlBase}/system/:tab?`}
                    render={(props) =>
                      this.withTokenCheck(
                        <System
                          {...props}
                          options={applicationOptions}
                          state={applicationState}
                        />,
                      )
                    }
                  />
                  <Redirect
                    from="*"
                    to={`${urlBase}/system`}
                  />
                </Switch>
              ) : (
                <Switch>
                  <Route
                    path={`${urlBase}/dashboard`}
                    render={(props) =>
                      this.withTokenCheck(
                        <div className="view">
                          <Dashboard
                            server={applicationState.server}
                            {...props}
                          />
                        </div>,
                      )
                    }
                  />
                  <Route
                    path={`${urlBase}/searches/:id?`}
                    render={(props) =>
                      this.withTokenCheck(
                        <div className="view">
                          <Searches
                            server={applicationState.server}
                            {...props}
                          />
                        </div>,
                      )
                    }
                  />
                  <Route
                    path={`${urlBase}/browse`}
                    render={(props) =>
                      this.withTokenCheck(<Browse {...props} />)
                    }
                  />
                  <Route
                    path={`${urlBase}/users`}
                    render={(props) =>
                      this.withTokenCheck(<Users {...props} />)
                    }
                  />
                  <Route
                    path={`${urlBase}/chat`}
                    render={(props) =>
                      this.withTokenCheck(
                        <Chat
                          {...props}
                          state={applicationState}
                        />,
                      )
                    }
                  />
                  <Route
                    path={`${urlBase}/rooms`}
                    render={(props) =>
                      this.withTokenCheck(<Rooms {...props} />)
                    }
                  />
                  <Route
                    path={`${urlBase}/uploads`}
                    render={(props) =>
                      this.withTokenCheck(
                        <div className="view">
                          <Transfers
                            {...props}
                            direction="upload"
                          />
                        </div>,
                      )
                    }
                  />
                  <Route
                    path={`${urlBase}/downloads`}
                    render={(props) =>
                      this.withTokenCheck(
                        <div className="view">
                          <Transfers
                            {...props}
                            direction="download"
                            server={applicationState.server}
                          />
                        </div>,
                      )
                    }
                  />
                  <Route
                    path={`${urlBase}/system/:tab?`}
                    render={(props) =>
                      this.withTokenCheck(
                        <System
                          {...props}
                          options={applicationOptions}
                          state={applicationState}
                          theme={theme}
                        />,
                      )
                    }
                  />
                  <Redirect
                    from="*"
                    to={`${urlBase}/dashboard`}
                  />
                </Switch>
              )}
            </AppContext.Provider>
          </div>
        </div>

        <ToastContainer
          autoClose={5_000}
          closeOnClick
          draggable={false}
          hideProgressBar={false}
          newestOnTop
          pauseOnFocusLoss
          pauseOnHover
          position="bottom-right"
          rtl={false}
        />
      </>
    );
  }
}

export default App;
