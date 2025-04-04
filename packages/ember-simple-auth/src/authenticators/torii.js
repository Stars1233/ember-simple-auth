import { assert, deprecate } from '@ember/debug';
import { isPresent, isEmpty } from '@ember/utils';
import BaseAuthenticator from './base';

deprecate('Ember Simple Auth: The Torii authenticator is deprecated.', false, {
  id: 'ember-simple-auth.authenticators.torii',
  until: '8.0.0',
  for: 'ember-simple-auth',
  since: {
    enabled: '4.2.0',
  },
});

/**
  Authenticator that wraps the
  [Torii library](https://github.com/adopted-ember-addons/torii) and thus allows to connect
  any external authentication provider that torii defines a provider for.

  In order to use this authenticator, __the application needs to have the
  [torii addon](https://github.com/adopted-ember-addons/torii) installed and must inject
  the torii service into the authenticator__:

  ```js
  // app/authenticators/torii.js
  import Torii from 'ember-simple-auth/authenticators/torii';
  import { service } from '@ember/service';

  export default class ToriiAuthenticator extends Torii {
    &#64;service torii;
  }
  ```

  @class ToriiAuthenticator
  @deprecated Implement an authenticator that wraps Torii in application code instead: since 4.2.0
  @extends BaseAuthenticator
  @public
*/
export default class ToriiAuthenticator extends BaseAuthenticator {
  _provider = null;

  /**
    Restores the session by calling the torii provider's `fetch` method.

    __Many torii providers do not implement the `fetch` method__. If the
    provider in use does not implement the method simply add it as follows:

    ```js
    // app/torii-providers/facebook.js
    import FacebookOauth2Provider from 'torii/providers/facebook-oauth2';

    export default class FacebookToriiProvider extends FacebookOauth2Provider {
      fetch(data) {
        return data;
      }
    }
    ```

    @memberof ToriiAuthenticator
    @method restore
    @param {Object} data The data to restore the session from
    @return {Promise} A promise that when it resolves results in the session becoming or remaining authenticated
    @public
  */
  restore(data) {
    this._assertToriiIsPresent();

    data = data || {};
    if (!isEmpty(data.provider)) {
      const { provider } = data;

      return this.get('torii')
        .fetch(data.provider, data)
        .then(
          fetchedData => {
            this._authenticateWithProvider(provider, fetchedData);
            return Object.assign(data, fetchedData);
          },
          err => {
            delete this._provider;
            throw err;
          }
        );
    } else {
      delete this._provider;
      return Promise.reject();
    }
  }

  /**
    Authenticates the session by opening the specified torii provider. For more
    documentation on torii and its providers abstraction, see the
    [project's README]( https://github.com/adopted-ember-addons/torii), specifically
    the
    [section on providers](https://github.com/adopted-ember-addons/torii).

    @memberof ToriiAuthenticator
    @method authenticate
    @param {String} provider The torii provider to authenticate the session with
    @param {Object} options The options to pass to the torii provider
    @return {Promise} A promise that when it resolves results in the session becoming authenticated
    @public
  */
  authenticate(provider, options) {
    this._assertToriiIsPresent();

    return this.get('torii')
      .open(provider, options || {})
      .then(data => {
        this._authenticateWithProvider(provider, data);
        return data;
      });
  }

  /**
    Closes the torii provider. If the provider is successfully closed, this
    method returns a resolving promise, otherwise it will return a rejecting
    promise, thus intercepting session invalidation.

    @memberof ToriiAuthenticator
    @method invalidate
    @return {Promise} A promise that when it resolves results in the session being invalidated
    @public
  */
  invalidate(data) {
    return this.get('torii')
      .close(this._provider, data)
      .then(() => {
        delete this._provider;
      });
  }

  _authenticateWithProvider(provider, data) {
    data.provider = provider;
    this._provider = data.provider;
  }

  _assertToriiIsPresent() {
    const torii = this.get('torii');
    assert(
      'You are trying to use the torii authenticator but torii is not available. Inject torii into the authenticator with "torii: Ember.inject.service()".',
      isPresent(torii)
    );
  }
}
