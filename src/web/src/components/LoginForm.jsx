import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from 'semantic-ui-react';

const Logos = [
  `      ▄▄▄▄     ▄▄▄▄     ▄▄▄▄
▄▄▄▄▄▄█  █▄▄▄▄▄█  █▄▄▄▄▄█  █
█__ --█  █__ --█    ◄█  -  █
█▄▄▄▄▄█▄▄█▄▄▄▄▄█▄▄█▄▄█▄▄▄▄▄█`,
  `        ▄▄▄▄         ▄▄▄▄       ▄▄▄▄
▄▄▄▄▄▄▄ █  █ ▄▄▄▄▄▄▄ █  █▄▄▄ ▄▄▄█  █
█__ --█ █  █ █__ --█ █    ◄█ █  -  █
█▄▄▄▄▄█ █▄▄█ █▄▄▄▄▄█ █▄▄█▄▄█ █▄▄▄▄▄█`,
];

const initialState = {
  password: '',
  rememberMe: true,
  username: '',
};

const LoginForm = ({ error, loading, onLoginAttempt }) => {
  const usernameRef = useRef();
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const logo = useMemo(
    () => Logos[Math.floor(Math.random() * Logos.length)],
    [],
  );

  useEffect(() => {
    setReady(state.username !== '' && state.password !== '');
  }, [state]);

  useEffect(() => {
    usernameRef.current?.focus();
  }, [loading]);

  const handleChange = (field, value) =>
    setState((prev) => ({ ...prev, [field]: value }));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && ready && !loading) {
      onLoginAttempt(state.username, state.password, state.rememberMe);
    }
  };

  const { password, rememberMe, username } = state;

  return (
    <div className="login-page">
      <div className="login-card">
        {/* ASCII Logo */}
        <div className="login-logo">
          <code className="login-logo-text">{logo}</code>
        </div>

        <h1 className="login-title">Sign in to slskd</h1>
        <p className="login-subtitle">Your self-hosted Soulseek client</p>

        {/* Username */}
        <div className="login-field">
          <label
            className="login-label"
            htmlFor="login-username"
          >
            Username
          </label>
          <input
            autoComplete="username"
            className="login-input"
            disabled={loading}
            id="login-username"
            onChange={(e) => handleChange('username', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter username"
            ref={usernameRef}
            type="text"
            value={username}
          />
        </div>

        {/* Password */}
        <div className="login-field">
          <label
            className="login-label"
            htmlFor="login-password"
          >
            Password
          </label>
          <input
            autoComplete="current-password"
            className="login-input"
            disabled={loading}
            id="login-password"
            onChange={(e) => handleChange('password', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter password"
            type="password"
            value={password}
          />
        </div>

        {/* Remember me */}
        <label className="login-remember">
          <input
            checked={rememberMe}
            disabled={loading}
            onChange={() => handleChange('rememberMe', !rememberMe)}
            type="checkbox"
          />
          Remember me
        </label>

        {/* Submit */}
        <button
          className={`login-btn${loading ? ' login-btn--loading' : ''}`}
          disabled={!ready || loading}
          onClick={() => onLoginAttempt(username, password, rememberMe)}
          type="button"
        >
          {loading ? (
            <Icon
              loading
              name="circle notch"
            />
          ) : (
            <Icon name="sign in" />
          )}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        {/* Error */}
        {error && (
          <div className="login-error">
            <Icon name="exclamation circle" />
            {error.message ?? 'Login failed'}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;
