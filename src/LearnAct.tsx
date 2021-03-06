import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Act, FrequencyType, normalizeString, PageProps, stopwords } from './utils';
import { faUndoAlt } from '@fortawesome/free-solid-svg-icons/faUndoAlt';
import { faMoon } from '@fortawesome/free-solid-svg-icons/faMoon';
import { faSun } from '@fortawesome/free-solid-svg-icons/faSun';
import { useCookies } from 'react-cookie';
import { faTasks } from '@fortawesome/free-solid-svg-icons/faTasks';
import { faQuoteRight } from '@fortawesome/free-solid-svg-icons/faQuoteRight';
import LineByLine from './LineByLine';
import TestAct from './TestAct';
import firebase from 'firebase/app';
import 'firebase/auth';

enum Theme {
    Light,
    Dark,
}

enum Mode {
    LineByLine,
    Test,
}

export interface LearnProps {
    act: Act;
    frequencies: FrequencyType;
}

export default function LearnAct(
    {
        acts,
        setLoading,
        loading,
    }: PageProps,
): ReactElement {
    const { actId } = useParams<{ actId: string }>();
    const act = acts.filter(act => act.id === actId)[0];

    const [cookies, setCookie] = useCookies(['theme', `filtered-frequency-data-${actId}`]);
    const [frequencies, setFrequencies] = useState(cookies[`filtered-frequency-data-${actId}`] || null);

    const [theme, setTheme] = useState(Number(cookies.theme || Theme.Light));
    const toggleTheme = useCallback(() => {
        setTheme(1 - theme);
        setCookie('theme', 1 - theme);
    }, [theme]);

    const [mode, setMode] = useState(Mode.LineByLine);
    const toggleMode = useCallback(() => {
        setMode(1 - mode);
    }, [mode]);

    const [rawWords, setRawWords] = useState<string[] | null>(null);

    const [onInitialAuthCheck, setOnInitialAuthCheck] = useState(true);
    useEffect(() => {
        firebase
            .auth()
            .onAuthStateChanged((user) => {
                setOnInitialAuthCheck(false);

                if (user && onInitialAuthCheck) {
                    setMode(Mode.Test);
                }
            })
    }, []);

    useEffect(() => {
        const words = Array.from(new Set(
            act.quotes
                .map(e => e.text
                    .replaceAll('\n', ' ')
                    .split(' '),
                )
                .flat()
                .filter(normalizeString),
        ));
        setRawWords(words);

        if (cookies[`filtered-frequency-data-${actId}`]) {
            return;
        }

        setLoading && setLoading(true);

        Promise.all(
            words
                .map(async e =>
                    await fetch(`https://api.datamuse.com/words?sp=${e.replaceAll(/[^a-zA-Z\-']/g, '')}&md=f&max=1`)
                        .then(res => res.json()),
                ).flat(),
            )
            .then(e => {
                const frequencies = Object.fromEntries(
                    e
                        .map((e, i) => [
                            words[i],
                            e[0]?.hasOwnProperty('tags')
                            ? parseInt(e[0].tags[0].slice(2))
                            : 1
                        ])
                        .map(e => stopwords.includes(normalizeString(e[0] as string)) ? [e[0], 10000, e[1]] : e)
                        .filter(e => e[1] < 400),
                );

                setFrequencies(frequencies);
                setCookie(`filtered-frequency-data-${actId}`, JSON.stringify(frequencies), {
                    expires: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 2)
                });
                setLoading && setLoading(false);
            });
    }, [act.quotes, cookies]);

    return (
        <div className={`learn-act${theme === Theme.Dark ? ' dark' : ' light'}`}>
            <div className='options-header'>
                <h1 className='act-info'>
                    {
                        act.name
                    }
                </h1>

                <div className='options'>
                    <Link className='option-button' to='/'>
                        <FontAwesomeIcon icon={faUndoAlt} />
                    </Link>
                    <button className='option-button' onClick={toggleMode}>
                        <FontAwesomeIcon icon={mode === Mode.LineByLine ? faTasks : faQuoteRight} />
                    </button>
                    <button className='option-button' onClick={toggleTheme}>
                        <FontAwesomeIcon icon={theme === Theme.Dark ? faSun : faMoon} />
                    </button>
                </div>
            </div>

            {
                !loading && frequencies && rawWords && (
                    mode === Mode.LineByLine ? (
                        <LineByLine act={act} frequencies={frequencies} />
                    ) : (
                        <TestAct act={act} frequencies={frequencies} />
                    )
                )
            }
        </div>
    );
}
