/**
 * Root Navigator
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MapScreen from '../screens/MapScreen';

const Stack = createStackNavigator();

const RootNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="Map" component={MapScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
