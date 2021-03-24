import React, { ReactElement } from 'react';
import 'firebase/firestore';
import { PageProps } from './types';
import { Link } from 'react-router-dom';

export default function AllActs(
    {
        acts
    }: PageProps
): ReactElement {
    return (
        <div className='all-acts'>
            <h1>
                Shakespeare quotations!
            </h1>
            <p>
                Select an act from the list below to start learning. You will then be able to select from individual
                quotations to practice, or test yourself on the whole act.
            </p>

            <div className='act-container'>
                {
                    acts.map(act => (
                        <Link
                            to={`/learn/${act.id}`}
                            className='act-card'
                            key={act.id}
                        >
                            <h3>
                                {
                                    act.name
                                }
                            </h3>
                            <p>
                                {
                                    act.description
                                }
                            </p>
                            <h6>
                                {
                                    act.quotes.length
                                }
                                &nbsp;quotations
                            </h6>
                        </Link>
                    ))
                }
            </div>
        </div>
    );
}
