import {Dispatch, Reducer, useEffect, useReducer, useState} from "react";
import reducer, {Creators} from "../store/filter";
import {MUIDataTableColumn} from "mui-datatables";
import {State as FilterState, Action as FilterActions} from "../store/filter/types";
import {useDebounce} from "use-debounce";
import {useHistory} from 'react-router';
import {History} from 'history';
import {isEqual } from 'lodash';
import * as yup from '../util/vendor/yup';

interface FilterManageOptions{
    columns: MUIDataTableColumn[];
    rowsPerPage: number;
    rowsPerPageOptions: number[];
    debounceTime: number;
    history: History
}

interface UseFilterOptions extends Omit<FilterManageOptions,'history'>{

}

export default function useFilter(options: UseFilterOptions){
    const history = useHistory();
    const filterManager = new FilterManager({...options, history});
    const INITIAL_STATE = filterManager.getStateFromURL();
    const [filterState, dispatch] = useReducer<Reducer<FilterState, FilterActions>>(reducer,INITIAL_STATE);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [debouncedFilterState] = useDebounce(filterState,options.debounceTime);


    useEffect(() => {
        filterManager.replaceHistory();
    },[])


    filterManager.state = filterState;
    filterManager.dispatch = dispatch;
    return{
        debouncedFilterState,
        filterManager,
        filterState,
        dispatch,
        totalRecords,
        setTotalRecords
    }
}

export class FilterManager{

    schema;
    state: FilterState = null as any;
    dispatch: Dispatch<FilterActions> = null as any;
    columns: MUIDataTableColumn[];
    rowsPerPage: number;
    rowsPerPageOptions: number[];
    history: History


    constructor(options: FilterManageOptions) {
        const {columns, rowsPerPage, rowsPerPageOptions, history} = options;
        this.columns = columns;
        this.rowsPerPage = rowsPerPage;
        this.rowsPerPageOptions = rowsPerPageOptions;
        this.history = history;
        this.createValidationSchema();
    }

    changeSearch(value){
        this.dispatch(Creators.setSearch({search: value}));
    }

    changePage(page){
        this.dispatch(Creators.setPage({page: page + 1}));
    }

    changeRowsPerPage(perPage){
        this.dispatch(Creators.setPerPage({per_page: perPage}))
    }

    changeColumnSort(changedColumn: string, direction: string){
        this.dispatch(Creators.setOrder({
            dir: direction,
            sort: changedColumn
        }))
    }

    clearSearchText(text){
        let newText = text;
        if(text && text.value !== undefined){
            newText = text.value;
        }
        return newText;
    }

    replaceHistory(){
        this.history.replace({
            pathname: this.history.location.pathname,
            search: "?" + new URLSearchParams(this.formatSearchParams() as any),
            state: this.state
        })
    }

    pushHistory(){
        const newLocation = {
            pathname: this.history.location.pathname,
            search: "?" + new URLSearchParams(this.formatSearchParams() as any),
            state:{
                ...this.state,
                search: this.clearSearchText(this.state.search)
            }
        }
        const oldState = this.history.location.state;
        const nextState = this.state;
        if(isEqual(oldState, nextState)){
            return;
        }

        this.history.push(newLocation);
    }

    private formatSearchParams(){
       const search = this.clearSearchText(this.state.search);
       return {
           ...(search && search !== '' && {search: search}),
           ...(this.state.pagination.page !== 1 && {page: this.state.pagination.page}),
           ...(this.state.pagination.per_page !== 15 && {per_page: this.state.pagination.per_page}),
           ...(this.state.order.sort && {
               sort: this.state.order.sort,
               dir: this.state.order.dir
           })
       }
    }

    getStateFromURL(){
        const queryParams = new URLSearchParams(this.history.location.search.substr(1));
        return this.schema.cast({
            search: queryParams.get('search'),
            pagination: {
                page: queryParams.get('page'),
                per_page: queryParams.get('per_page')
            },
            order:{
                sort: queryParams.get('sort'),
                dir: queryParams.get('dir')
            }
        })
    }

    private createValidationSchema(){
        this.schema = yup.object().shape({
            search: yup.string()
                .transform(value => !value ? undefined : value)
                .default(''),
            pagination: yup.object().shape({
                page: yup.number()
                    .transform(value => isNaN(value) || parseInt(value) < 1 ? undefined : value)
                    .default(1),
                per_page: yup.number()
                    .oneOf(this.rowsPerPageOptions)
                    .transform(value => isNaN(value) ? undefined : value)
                    .default(this.rowsPerPage)
            }),
            order: yup.object().shape({
                sort: yup.string()
                    .nullable()
                    .transform(value => {
                        const columnsName = this.columns
                            .filter(column => !column.options || column.options.sort !== false)
                            .map(column => column.name);
                        return columnsName.includes(value) ? value : undefined;
                    })
                    .default(null),
                dir: yup.string()
                    .nullable()
                    .transform(value => !value || !['asc','desc'].includes(value.toLowerCase()) ? undefined : value)
                    .default(null)
            })
        })
    }
}