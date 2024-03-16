import {View, Text, TextInput, TouchableOpacity} from 'react-native';
import React, {useState} from 'react';
// import firestore from '@react-native-firebase/firestore';

import auth from '@react-native-firebase/auth';
const EmailPassAuth = () => {
  const [Email, setEmail] = useState('');
  const [Password, setPassword] = useState('');
  const [Phone, setPhone] = useState(undefined);
  

  const CreateUser = async () => {
    auth()
      .createUserWithEmailAndPassword(Email, Password)
      .then(() => {
        console.warn('User account created & signed in!');
      })
      .catch(error => {
        if (error.code === 'auth/email-already-in-use') {
          console.warn('That email address is already in use!');
        }

        if (error.code === 'auth/invalid-email') {
          console.warn('That email address is invalid!');
        }

        console.error(error);
      });
  };

  const userSignin = async () => {
    await auth()
      .signInWithEmailAndPassword(Email, Password)
      .then(() => {
        console.warn('User Logged in');
        <Home />;
      })
      .catch(error => {
        console.log(error);
      });
  };

  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
      <TextInput
        placeholder="Enter Email"
        value={Email}
        onChangeText={text => setEmail(text)}
        style={{
          width: '80%',
          height: 50,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: 'blue',
          paddingLeft: 20,
          marginBottom: 20,
        }}
      />
      <TextInput
        placeholder="Enter Mobile No."
        value={Phone}
        onChangeText={text => setPhone(text)}
        style={{
          width: '80%',
          height: 50,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: 'blue',
          paddingLeft: 20,
          marginBottom: 20,
        }}
      />
      <TextInput
        placeholder="Enter Password"
        value={Password}
        onChangeText={text => setPassword(text)}
        style={{
          width: '80%',
          height: 50,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: 'blue',
          paddingLeft: 20,
        }}
      />
      <TouchableOpacity
        style={{
          marginTop: 30,
          width: '70%',
          height: 40,
          borderRadius: 10,
          backgroundColor: 'lightblue',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 3,
        }}
        onPress={() => {
          CreateUser();
        }}>
        <Text style={{fontSize: 20, fontWeight: 'bold', color: '#000'}}>
          Create Account
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          marginTop: 30,
          width: '70%',
          height: 40,
          borderRadius: 10,
          backgroundColor: 'lightblue',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 3,
        }}
        onPress={() => {
          userSignin();
        }}>
        <Text style={{fontSize: 20, fontWeight: 'bold', color: '#000'}}>
          Sign In
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default EmailPassAuth;
