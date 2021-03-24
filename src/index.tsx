import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './styles.scss';

import firebase from 'firebase/app';
import 'firebase/analytics';
import { CookiesProvider } from 'react-cookie';

const firebaseConfig = {
    apiKey: 'AIzaSyDe0dC5_xW2wV3Fi0eKod5UrDL8zSo0NDo',
    authDomain: 'shakespeare-words.firebaseapp.com',
    projectId: 'shakespeare-words',
    storageBucket: 'shakespeare-words.appspot.com',
    messagingSenderId: '182545701732',
    appId: '1:182545701732:web:b08b80cc72a6a883213871',
    measurementId: 'G-9X02QGSXF5',
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

ReactDOM.render(
    <React.StrictMode>
        <CookiesProvider>
            <App />
        </CookiesProvider>
    </React.StrictMode>,
    document.getElementById('root'),
);

