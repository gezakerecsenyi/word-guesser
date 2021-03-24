import { ReactElement, useCallback, useEffect, useState } from 'react';

interface Props {
    word: string;
    selected: boolean;
    id: string;
    focusser: any;
    forceComplete: boolean;

    nextWord(): void;
}

export default function WordGuesser(
    {
        word,
        nextWord,
        selected,
        id,
        focusser,
        forceComplete,
    }: Props,
): ReactElement {
    const [wordSoFar, setWordSoFar] = useState('_'.repeat(word.length));
    const [done, setDone] = useState(false);
    const handleType = useCallback((event) => {
        let newWord = event.target.value.replaceAll('_', '');

        if (event.target.value.length < wordSoFar.length) {
            newWord = wordSoFar.replaceAll('_', '').slice(0, -(wordSoFar.length - event.target.value.length));
        }

        if (newWord.length > word.length) {
            return;
        }

        setWordSoFar(`${newWord}${'_'.repeat(word.length - newWord.length)}`);

        if (newWord.toLowerCase() === word.toLowerCase()) {
            nextWord();
            setDone(true);
            setWordSoFar(word);
        }
    }, [wordSoFar, word]);

    const [awaitingFocus, setAwaitingFocus] = useState(false);
    useEffect(() => {
        if (awaitingFocus) {
            document.getElementById(id)?.focus();
            setAwaitingFocus(false);
        }
    }, [awaitingFocus]);

    const disabled = done || !selected || forceComplete;
    useEffect(() => {
        setAwaitingFocus(true);
    }, [disabled, focusser]);

    useEffect(() => {
        if (forceComplete) {
            setWordSoFar(word);
        }
    }, [forceComplete, word]);

    return (
        <input
            className='word-guesser'
            value={wordSoFar}
            disabled={disabled}
            onChange={handleType}
            autoComplete='off'
            autoCapitalize='off'
            autoCorrect='off'
            id={id}
            style={{
                width: `${word.length}ch`,
            }}
        />
    );
}
