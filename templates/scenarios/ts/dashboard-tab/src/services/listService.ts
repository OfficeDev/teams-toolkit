import ListData from "../data/ListData.json";
import { ListModel } from "../models/listModel";

/**
 * Retrive sample data
 * @returns data for list widget
 */
export const getListData = (): ListModel[] => ListData;
