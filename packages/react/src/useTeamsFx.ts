import { useEffect, useReducer } from "react";
import {
    TeamsUserCredential,
    ErrorCode
} from "@microsoft/teamsfx";
import { getCredential } from "./credential";

type CredentialHandler = (credential: TeamsUserCredential) => Promise<any>;

interface TeamsFxState<T> {
    requirePermission: boolean;
    credential?: TeamsUserCredential;
    data?: T;
    error?: Error;
}

export interface TeamsFxData<T> extends TeamsFxState<T> {
    login: () => Promise<void>;
}

type Action<T> =
    | { type: 'login success' }
    | { type: 'require permission'; error: Error }
    | { type: 'data update'; data: T }
    | { type: 'login error'; error: Error }
    | { type: 'user error'; error: Error };

export function useTeamsFx<T>(handler: CredentialHandler, scopes: string[] = [".default"]): TeamsFxData<T> {
    const reducer = (state: TeamsFxState<T>, action: Action<T>): TeamsFxState<T> => {
        switch (action.type) {
            case 'login success':
                return { requirePermission: false, credential: state.credential, data: state.data, error: undefined };
            case 'require permission':
                return { requirePermission: true, credential: state.credential, data: undefined, error: action.error };
            case 'data update':
                return { requirePermission: false, credential: state.credential, data: action.data, error: undefined };
            case 'login error':
                return { requirePermission: true, credential: state.credential, data: undefined, error: action.error };
            case 'user error':
                return { requirePermission: false, credential: state.credential, data: undefined, error: action.error };
            default:
                return state;
        }
    }

    const teamsUserCredential = getCredential(scopes);
    const [{requirePermission, credential, data, error}, dispatch] = useReducer(
        reducer,
        { requirePermission: false, credential: teamsUserCredential, data: undefined, error: undefined }
    );
    const login = async () => {
        if (!credential) {
            return;
        }
        try {   
            await credential.login(scopes);
            dispatch({ type: 'login success' });
        } catch (e) {
            alert(e.error);
            alert(e.code);
            if (e.code === ErrorCode.UiRequiredError) {
                alert(e);
                dispatch({ type: 'require permission', error: e });
            }
            else {
                dispatch({ type: 'login error', error: e });
            }
        }
        await fetchData(credential);
    }
    const fetchData = async (credential: TeamsUserCredential) => {
        try {
            const result = await handler(credential);
            dispatch({ type: 'data update', data: result });
        } catch (e) {
            alert(e.error);
            alert(e.code);
            if (e.code === ErrorCode.UiRequiredError) {
                alert(e);
                dispatch({ type: 'require permission', error: e });
            }
            else {
                dispatch({ type: 'user error', error: e });
            }
        }
    }
    useEffect(() => {
        fetchData(teamsUserCredential);
    }, []);
    return { requirePermission, credential, data, error, login };
}
