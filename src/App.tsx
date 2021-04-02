import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import AllActs from './AllActs';
import LearnAct from './LearnAct';
import firebase from 'firebase/app';
import 'firebase/app';
import { Act, Quote } from './utils';
import Loader from 'react-loader-spinner';

function App() {
    const [acts, setActs] = useState<Act[] | null>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        firebase
            .firestore()
            .collection('acts')
            .orderBy('number', 'asc')
            .get()
            .then(async acts => {
                setActs(
                    await Promise.all(
                        acts.docs.map(async e => (
                            {
                                ...e.data(),
                                id: e.id,
                                quotes: await e
                                    .ref
                                    .collection('quotes')
                                    .get()
                                    .then(Q => Q.docs.map(V => ({
                                        text: (V.data() as Quote).text.replace(/\\n/g, '\n'),
                                        character: V.data().character,
                                        preceeding: V.data().preceeding,
                                        id: V.id,
                                    }))),
                            } as Act
                        )),
                    ),
                );
                setLoading(false);
            });
    }, []);

    if (loading || !acts) {
        return (
            <div className='loading-page'>
                <Loader
                    type='TailSpin'
                    height={120}
                    width={120}
                    color='#00d1b2'
                />
                <h3>
                    Loading Shakespeare's finest...
                </h3>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Switch>
                <Route path='/learn/:actId'>
                    <LearnAct acts={acts} setLoading={setLoading} />
                </Route>
                <Route path='/'>
                    <AllActs acts={acts} />
                </Route>
            </Switch>
        </BrowserRouter>
    );
}

export default App;
