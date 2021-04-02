export interface IAADPassword {
    hint?: string;
    id?: string;
    endDate?: string;
    startDate?: string;
    value?: string;
}

export interface IAADApplication {
    id?: string;
    displayName: string;
    passwords?: IAADPassword[];
    objectId?: string;
}
