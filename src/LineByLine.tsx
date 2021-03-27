import { normalizeString, useRandomItem } from './utils';
import React, { Fragment, ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import WordGuesser from './WordGuesser';
import { LearnProps } from './LearnAct';


export default function LineByLine(
    {
        act,
        frequencies,
    }: LearnProps,
): ReactElement {
    const [item, nextItem, prevItem, textData] = useRandomItem(
        act.quotes,
        frequencies,
        () => {
            setCurrentWord(0);
            setForceComplete(false);
        },
    );

    const text = item.text
        .split('\n')
        .map((e, i) => <Fragment key={i}>{e}<br /></Fragment>);

    const [currentWord, setCurrentWord] = useState(0);
    const nextWord = useCallback(() => {
        if (!document.getElementById(`${act.id}-word-${currentWord + 1}`)) {
            nextItem();
            return;
        }

        setCurrentWord(currentWord + 1);
    }, [act.id, currentWord, nextItem]);

    const [focusser, setFocusser] = useState(Math.random());
    const focusCurrent = useCallback(() => {
        setFocusser(Math.random());
    }, []);

    const [forceComplete, setForceComplete] = useState(false);
    const boxifiedText = useMemo(() => {
        let indexHere = 0;
        return text.map((e) => [
            e.props.children[0]
                .split(/([,!:.? ])/g)
                .map((q: string, index: number) => {
                        if (textData.includes(normalizeString(q))) {
                            indexHere += 1;
                            return React.createElement(WordGuesser, {
                                word: q,
                                key: index,
                                nextWord: nextWord,
                                selected: currentWord === indexHere - 1,
                                id: `${act.id}-word-${indexHere - 1}`,
                                focusser,
                                forceComplete,
                            });
                        } else {
                            return q;
                        }
                    },
                ),
            e.props.children[1],
        ]);
    }, [currentWord, nextWord, text, textData, focusser, forceComplete]);

    useEffect(() => {
        const newEvent = (event: KeyboardEvent) => {
            if (event.code === 'Tab') {
                event.stopPropagation();
                event.preventDefault();

                setForceComplete(true);
            }
        };
        window.addEventListener('keydown', newEvent);

        return () => {
            window.removeEventListener('keydown', newEvent);
        }
    }, []);

    return (
        <div className='line-by-line' onClick={focusCurrent}>
            <button
                className='circle-button prev-button'
                onClick={prevItem}
            >
                <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <div className='container'>
                <h2 className='speaker'>
                    {
                        item.character
                    }
                </h2>
                <button
                    className='contents'
                    onClick={() => setForceComplete(true)}
                >
                    <h5 className='desktop-only'>
                        Press&nbsp;
                        <span className='key'>
                        TAB
                    </span>
                        &nbsp;to skip
                    </h5>
                    <h5 className='mobile-only'>
                        Tap here to skip
                    </h5>
                </button>
                <p className='text'>
                    {
                        boxifiedText
                    }
                </p>
            </div>

            <button
                className='circle-button next-button'
                onClick={nextItem}
            >
                <FontAwesomeIcon icon={faChevronRight} />
            </button>
        </div>
    );
}
