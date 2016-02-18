import React, {
  StyleSheet,
  View,
  Text,
  Navigator,
} from 'react-native';

import Home from './home/home.js';
import NavigationBar from 'react-native-navbar';
import NoConnection from './NoConnection.js';
import Onboarding from './onboarding/Onboarding.js';

import ddpClient from '../config/db/lib/ddpClient';
import Accounts from '../config/db/accounts';

// Polyfill the process functionality needed for minimongo-cache
global.process = require("../config/db/lib/process.polyfill");

export default React.createClass({
  // Configuration
  displayName: 'Main',

  // Initial Value (State and Props)
  getInitialState() {
    return {
      loaded: false,
      connecting: false,
      connectionFailed: false,
      showOnboarding: true,
      user: null
    };
  },

  // Try to establish DDP connection
  attemptConnection() {
    this.setState({
      loaded: false
    })

    // Close any connections if active
    try {
      ddpClient.close()
    } catch (err) {
      console.log(err);
    }

    ddpClient.initialize()
      .catch((err) => {
        this.setState({
          loaded: true,
          connectionFailed: true
        });
      })
      .then(() => {
        return Accounts.signInWithToken();
      })
      .then((res) => {
        return this.setState({
          loaded: true,
          connectionFailed: false
        });
      })
      .catch((err) => {
        console.log(err)

        // This will occur is you switch environments
        if (err.reason === "You've been logged out by the server. Please log in again."){
          Accounts.signOut();
        }
        this.setState({
          loaded: true
        });
        return
      })
  },
  handleOnboardingPress() {
    this.setState({
      showOnboarding: false
    })
  },

  // Component Lifecycle
  componentWillMount() {
    this.attemptConnection();

    // Handling user session
    Accounts.userId.then((userId) => {
      if (userId) {
        this.setState({user: {_id: userId}});
      }
    });
  },

  handleLoggedIn(userId) {
    if (userId) {
      this.setState({user: {_id: userId}});
    }
  },
  handleLoggedOut() {
    this.setState({user: null})
  },

  componentWillUnmount() {
    ddpClient.close();
  },

  // Navigator Config
  configureScene(route) {
    if (route.sceneConfig) {
      return route.sceneConfig;
    }
    return {
      ...Navigator.SceneConfigs.HorizontalSwipeJump,
      gestures: false
    }
  },

  renderScene(route, navigator) {
    let Component = route.component;

    let title = {};
    if (route.title) {
      title.title = route.title;
    }

    let leftButton = undefined;
    if (route.leftButton) {
      leftButton = route.leftButton;
    }

    let rightButton = undefined;
    if (route.rightButton) {
      rightButton = React.cloneElement(route.rightButton, {navigator: navigator});
    }

    return (
      <View style={styles.container}>

        {this.state.user ?
        <NavigationBar
          title={title}
          leftButton={leftButton}
          rightButton={rightButton}
          />
        : null }

        <Component
          navigator={navigator}
          user={this.state.user}
          handleLoggedIn={this.handleLoggedIn}
          handleLoggedOut={this.handleLoggedOut}
          {...route.passProps}
          />
      </View>
    );
  },

  // Component Render
  render() {
    if (this.state.connectionFailed) {
      return <NoConnection handlePress={this.attemptConnection} loaded={this.state.loaded} />
    }

    if (!this.state.loaded) {
      return (
        <View style={styles.loading}>
          <Text>Connecting...</Text>
        </View>
      );
    }

    // Get initial route based on user state
    let initialRoute = this.state.user ?
      {
        component: Home,
        title: "Home"
      } : {
        component: Onboarding
      }

    return (
      <Navigator
        initialRoute={initialRoute}
        renderScene={this.renderScene}
        configureScene={this.configureScene}
      />
    );
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});