import {Dispatch, Reducer, useReducer, useState} from "react";
import reducer, {Creators, INITIAL_STATE} from "../store/filter";
import {MUIDataTableColumn} from "mui-datatables";
import {State as FilterState, Action as FilterActions} from "../store/filter/types";
import {useDebounce} from "use-debounce";
interface FilterManageOptions{
    columns: MUIDataTableColumn[];
    rowsPerPage: number;
    rowsPerPageOptions: number[];
    debounceTime: number;
}

export default function useFilter(options: FilterManageOptions){
    const [filterState, dispatch] = useReducer<Reducer<FilterState, FilterActions>>(reducer,INITIAL_STATE);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [debouncedFilterState] = useDebounce(filterState,options.debounceTime);
    const filterManager = new FilterManager(options);

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

    state: FilterState = null as any;
    dispatch: Dispatch<FilterActions> = null as any;
    columns: MUIDataTableColumn[];
    rowsPerPage: number;
    rowsPerPageOptions: number[];


    constructor(options: FilterManageOptions) {
        const {columns, rowsPerPage, rowsPerPageOptions, debounceTime} = options;
        this.columns = columns;
        this.rowsPerPage = rowsPerPage;
        this.rowsPerPageOptions = rowsPerPageOptions;
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


}