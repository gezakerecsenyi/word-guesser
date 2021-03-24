import { Act, normalizeString } from './types';
import React, { Fragment, ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import WordGuesser from './WordGuesser';

type FrequencyType = {
    [key: string]: number,
};

interface Props {
    act: Act;
    frequencies: FrequencyType;
}

const weightedRandFromSpec = (spec: { [key: number]: number }): number => {
    let sum = 0, r = Math.random();
    for (
        let q = 0, i = parseInt(Object.keys(spec)[0]);
        q < Object.keys(spec).length;
        q++, i = parseInt(Object.keys(spec)[q])
    ) {
        sum += spec[i];
        if (r <= sum) {
            return i;
        }
    }

    return Object.keys(spec)
        .map(e => parseInt(e))
        .sort((a, b) => a - b)
        .map(e => spec[e])[0];
};

const weightedRandom = (frequencies: number[]) => {
    const frequencySpec = Array(frequencies.length)
        .fill(0)
        .map((e, i) => i)
        .map(e => [e, (-Math.min(...frequencies)) + frequencies[e]]);
    const total = frequencySpec.reduce((a, e) => a + e[1], 0);

    const weightedFrequencySpec = frequencySpec.map(e => [
        e[0],
        total !== 0
        ? e[1] ? 1 - e[1] / total : 1
        : 1 / frequencySpec.length,
    ]);
    const weightedTotal = weightedFrequencySpec.reduce((a, e) => a + e[1], 0);

    const compensatedSpec = weightedFrequencySpec.map(e => [
        e[0],
        e[1] / weightedTotal,
    ]);

    return weightedRandFromSpec(
        Object.fromEntries(compensatedSpec),
    );
};

const getRandomItem = <T extends { id: string }>(array: T[], prevItems: string[] = ['']): T => {
    const cleanedArr = array.filter(e => e.id !== prevItems.slice(-1)[0]);

    const index = weightedRandom(array
        .map(V =>
            prevItems
                .map((e, i): [string, number] => [e, Math.sqrt(i + 1) * Math.random()], 0)
                .filter(e => e[0] === V.id)
                .reduce((a, e) => a + e[1], 0),
        )
        .filter((e, i) => array[i].id !== prevItems.slice(-1)[0]),
    );
    return cleanedArr[index];
};

function useRandomItem<T extends { id: string }>(
    array: T[],
    frequencies: FrequencyType,
    callback?: () => void,
): [T, () => void, () => void, string[]] {
    const [item, setItem] = useState(JSON.parse(JSON.stringify(array[0])));
    const textData = useCallback((item) => {
        const rawWords = item.text
            .replaceAll('\n', ' ')
            .split(' ')
            .map(normalizeString);

        const frequenciesHere = Object.entries(frequencies).filter(e => rawWords.includes(e[0]));
        const frequencyDistribution = (i: number) => {
            return 2 * 1.25 ** -((i - 1.4 * Math.sqrt(rawWords.length)) ** 2);
        };

        const wordSet = Array(
            weightedRandFromSpec(
                Object.fromEntries(
                    Array(Math.floor(rawWords.length))
                        .fill(0)
                        .map((e, i, a) => frequencyDistribution(i) / a.reduce(
                            (A, _, I) => A + frequencyDistribution(I),
                            0,
                        ))
                        .map((e, i) => i === 0 ? [0, 0] : [i, e]),
                ),
            ) || 1,
        )
            .fill(0)
            .map(() => weightedRandom(
                frequenciesHere.map((e) => (e[1] ** 2 - 15 * e[0].length ** 4.5 as number)),
            ))
            .map(e => frequenciesHere[e || 0][0]);

        return Array.from(
            new Set(
                wordSet.map(normalizeString),
            ),
            )
            .sort((a, b) => b.length - a.length);
    }, [frequencies]);

    const [prevItems, setPrevItems] = useState([{
        id: item.id,
        textData: textData(item),
    }]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextItem = useCallback(() => {
        if (currentIndex === prevItems.length - 1) {
            const newItem = JSON.parse(
                JSON.stringify(
                    getRandomItem(array, prevItems.map(e => e.id)),
                ),
            ) as T;

            setPrevItems([
                ...prevItems,
                {
                    id: newItem.id,
                    textData: textData(newItem),
                },
            ]);
        }

        setCurrentIndex(currentIndex + 1);
        callback && callback();
    }, [array, prevItems, currentIndex]);

    const prevItem = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            callback && callback();
        }
    }, [currentIndex]);

    useEffect(() => {
        setItem(array.filter(e => e.id === prevItems[currentIndex].id)[0]);
    }, [currentIndex]);

    return [item, nextItem, prevItem, prevItems[currentIndex].textData];
}

export default function LineByLine(
    {
        act,
        frequencies,
    }: Props,
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
        window.onkeydown = (event: KeyboardEvent) => {
            if (event.code === 'Tab') {
                event.stopPropagation();
                event.preventDefault();

                setForceComplete(true);
            }
        };
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
