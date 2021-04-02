import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { LearnProps } from './LearnAct';
import { Session, Test } from './utils';
import WordGuesser from './WordGuesser';

type IDMap = {
    [key: string]: string;
}

const handleWordChange = (
    newWord: string | undefined,
    questionList: (ReactElement | (string | ReactElement)[])[][] | null,
    session: null | Session,
    setSession: (session: Session) => void,
    setIdMap: (idMap: IDMap) => void,
    id?: string,
) => {
    if (!id || !questionList || !session) {
        return;
    }

    const idSegments = id.split('-').slice(1).map(parseFloat);
    const question = (questionList[idSegments[0]][idSegments[1]] as (string | object)[])[idSegments[2]] as ReactElement;

    const answerTree = questionList.map((e, qI) => (
            e
                .filter(Q => Q.hasOwnProperty('length'))
                .flat(1)
                .filter(Q => typeof Q === 'object') as ReactElement[]
        )
        .map((answerBox, aI) => [
                answerBox.key as string,
                answerBox.key === question.key && newWord
                ? newWord
                : (
                    session.responses[qI] || { data: [] }
                ).data[aI] || '',
            ],
        ),
    );

    setIdMap(Object.fromEntries(answerTree.flat(1)));

    setSession({
        ...session,
        responses: answerTree.map(e => e.map(Q => Q[1])).map(e => ({
            data: e,
        })),
    });
};

export default function TestAct(
    {
        act,
        frequencies,
    }: LearnProps,
): ReactElement {
    const [actCode, setActCode] = useState('______');
    const [name, setName] = useState('');
    const [idMap, setIdMap] = useState<IDMap>({});

    const [testData, setTestData] = useState<null | Test>(null);
    const [session, setSession] = useState<null | Session>(null);
    const [loading, setLoading] = useState(false);

    const handleActCodeChange = useCallback((event) => {
        let trimmedString = event.target.value.replaceAll(/[^0-9]/g, '').slice(0, 6);
        if (event.target.value.length < 6) {
            if (actCode.includes('_')) {
                trimmedString = trimmedString.slice(0, event.target.value.length - 6);
            }
        }

        setActCode(trimmedString.padEnd(6, '_'));
    }, [actCode]);

    const handleNameChange = useCallback((event) => {
        setName(event.target.value);
    }, []);

    const getTest = useCallback(() => {
        setLoading(true);
        firebase
            .firestore()
            .collection('tests')
            .where('code', '==', actCode)
            .get()
            .then((docs) => {
                const doc = docs.empty ? null : docs.docs[0];
                const data = doc ? doc.data() as Omit<Test, 'id'> : null;

                if (!doc || !data || data.locks.toDate() < new Date()) {
                    setLoading(false);
                    setActCode('______');
                    return;
                }

                firebase
                    .auth()
                    .signInAnonymously()
                    .then((user) => {
                        const uid = user.user?.uid;
                        if (!uid) {
                            setLoading(false);
                            return;
                        }

                        const newSession = {
                            name,
                            started: firebase.firestore.Timestamp.now(),
                            id: uid,
                            responses: [],
                        } as Session;
                        doc
                            .ref
                            .collection('sessions')
                            .doc(uid)
                            .set(newSession)
                            .then(() => {
                                setSession(newSession);

                                setTestData({
                                    ...data,
                                    id: doc.id,
                                } as Test);

                                setLoading(false);
                            });
                    });
            });
    }, [actCode, name]);

    useEffect(() => {
        firebase
            .auth()
            .onAuthStateChanged((user) => {
                if (!user) {
                    setSession(null);
                    setTestData(null);
                    return;
                }

                if (session || testData) {
                    return;
                }

                setLoading(true);

                firebase
                    .firestore()
                    .collectionGroup('sessions')
                    .where('id', '==', user.uid)
                    .get()
                    .then((res) => {
                        if (res.empty) {
                            setLoading(false);
                            return;
                        }

                        const session = res.docs[0];

                        session
                            .ref
                            .parent
                            .parent
                            ?.get()
                            .then((test) => {
                                const testData = {
                                    ...test.data(),
                                    id: test.id,
                                } as Test;
                                const sessionData = session.data() as Session;

                                setTestData(testData);
                                setSession(sessionData);

                                const newIdMap = {} as IDMap;
                                testData.questions.forEach((question, Q) =>
                                    question
                                        .text
                                        .split('\\n')
                                        .map((e) => [e.trim(), undefined])
                                        .flat()
                                        .map(e => typeof e === 'string'
                                                  ? e.split(/(\[[^\]]+])/g)
                                                  : e,
                                        )
                                        .forEach((e, V, a) =>
                                            typeof e === 'object' && e.forEach((_, i) => {
                                                if (i % 2) {
                                                    newIdMap[`Q-${Q}-${V}-${i}`] = (
                                                        sessionData.responses[Q] || { data: [] }
                                                    )
                                                        .data[
                                                    (
                                                        a
                                                            .slice(0, V)
                                                            .filter(e => e) as string[][]
                                                    )
                                                        .map((Q) => Q.filter((e, i) => i % 2))
                                                        .flat()
                                                        .length + (i - 1) / 2
                                                        ];
                                                }
                                            }),
                                        ),
                                );

                                setIdMap(newIdMap);
                                setLoading(false);

                                setActCode('______');
                                setName('');
                            });
                    });
            });
    }, [session, testData]);

    const submitAnswers = useCallback(() => {
        firebase
            .auth()
            .currentUser
            ?.delete();
    }, []);

    const [currentTimeout, setCurrentTimeout] = useState<number | null>(null);
    useEffect(() => {
        if (!testData) {
            if (currentTimeout) {
                clearTimeout(currentTimeout);
            }

            return;
        }

        const newTimeout = window.setTimeout(submitAnswers, testData.locks.toDate().getTime() - new Date().getTime());
        setCurrentTimeout(newTimeout);

        return () => window.clearTimeout(newTimeout);
    }, [testData?.locks]);

    useEffect(() => {
        if (session && testData) {
            firebase
                .firestore()
                .collection('tests')
                .doc(testData?.id)
                .collection('sessions')
                .doc(session.id)
                .update({
                    responses: session.responses,
                });
        }
    }, [session?.responses]);

    const questionList = useMemo(() => {
        return testData && testData.questions.map((question, Q) =>
            question
                .text
                .split('\\n')
                .map((e, i) => [e.trim(), <br key={`B-${Q}-${i}`} />])
                .flat()
                .map((e, V) =>
                    typeof e === 'string'
                    ? e
                        .split(/(\[[^\]]+])/g)
                        .map((e, i) => i % 2 ? (
                                <WordGuesser
                                    word={e.slice(1, -1)}
                                    selected={false}
                                    id={`Q-${Q}-${V}-${i}`}
                                    key={`Q-${Q}-${V}-${i}`}
                                    initValue={idMap[`Q-${Q}-${V}-${i}`]}
                                    forceEnable
                                    onChange={
                                        (a, e) => handleWordChange(
                                            a,
                                            questionList,
                                            session,
                                            setSession,
                                            setIdMap,
                                            e,
                                        )
                                    }
                                />
                            ) : e,
                        )
                    : e,
                ),
        );
    }, [testData, session, idMap]);

    return (
        <div className='test-act'>
            {
                (!testData || loading) ? (
                    <div className='request-code'>
                        <h1>
                            Enter your test code.
                        </h1>
                        <input
                            type='text'
                            className='act-code'
                            value={actCode}
                            onChange={handleActCodeChange}
                            disabled={loading}
                        />

                        <input
                            type='text'
                            className='name'
                            value={name}
                            placeholder='Enter your full name...'
                            onChange={handleNameChange}
                            disabled={loading}
                        />

                        <button
                            className='submit-act-code'
                            disabled={loading || actCode.includes('_') || !name}
                            onClick={getTest}
                        >
                            Begin
                        </button>
                    </div>
                ) : (
                    <div className='test-form'>
                        <h1 className='test-title'>
                            {testData.title}
                        </h1>

                        <div className='question-container'>
                            {
                                questionList && testData.questions.map((question, Q) => (
                                    <div className='question' key={Q}>
                                        <h2 className='character'>
                                            {
                                                question.character
                                            }
                                        </h2>

                                        <p className='text'>
                                            {
                                                question.preceeding && (
                                                    <em>
                                                        [{question.preceeding}]&nbsp;
                                                    </em>
                                                )
                                            }

                                            {
                                                questionList[Q].flat()
                                            }
                                        </p>
                                    </div>
                                ))
                            }
                        </div>

                        <button
                            className='submit-response'
                            onClick={submitAnswers}
                        >
                            Submit response
                        </button>
                    </div>
                )
            }
        </div>
    );
}
