import React, {useEffect, useRef, useState} from 'react';
import MUIDataTable, {MUIDataTableColumn} from "mui-datatables";
import httpVideo from "../../../util/http";
import format from "date-fns/format"
import parseISO from "date-fns/parseISO"
import categoryHttp from "../../../util/http/category-http";
import genreHttp from "../../../util/http/genre-http";
import {useSnackbar} from "notistack";
import {Category, Genre, ListResponse} from "../../../util/models";
import useFilter from "../../../hooks/useFilter";
import * as yup from "../../../util/vendor/yup";
import {MuiThemeProvider} from "@material-ui/core";
import DefaultTable, {makeActionStyles, TableColumn} from '../../../components/Table'
import FilterResetButton from "../../../components/Table/FilterResetButton";




const columnsDefinition: MUIDataTableColumn[] = [
    {
        name: "name",
        label: "Nome",
        options: {
            filter: false
        }
    },
    {
        name: "categories",
        label: "Categorias",
        options: {
            filterType: 'multiselect',
            filterOptions: {
                names: []
            },
            customBodyRender(value, tableMeta, updateValue ){
                return value.map(value => value.name).join(', ')
            },
        }
    },
    {
        name: "created_at",
        label: "Criado em",
        options: {
            customBodyRender(value, tableMeta, updateValue ){
                return <span>{format(parseISO(value),'dd/MM/yyyy')}</span>
            },
            filter: false
        }
    }
];
const debounceTime = 300;
const debouncedSearchTime = 300;
const rowsPerPage = 15;
const rowsPerPageOptions = [15, 25, 50];

const Table = () => {
    const snackbar = useSnackbar();
    const subscribed = useRef(true);
    const [data, setData] = useState<Genre[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [categories, setCategories] = useState<Category[]>();

    const {
        columns,
        filterManager,
        filterState,
        debouncedFilterState,
        dispatch,
        totalRecords,
        setTotalRecords,
    } = useFilter({
        columns: columnsDefinition,
        debounceTime: debounceTime,
        rowsPerPage,
        rowsPerPageOptions,
        extraFilter: {
            createValidationSchema: () => {
                return yup.object().shape({
                    categories: yup.mixed()
                        .nullable()
                        .transform(value => {
                            return !value || value === '' ? undefined : value.split(',');
                        })
                        .default(null),
                })
            },
            formatSearchParams: (debouncedState) => {
                return debouncedState.extraFilter ? {
                    ...(
                        debouncedState.extraFilter.categories &&
                        {categories: debouncedState.extraFilter.categories.join(',')}
                    )
                } : undefined
            },
            getStateFromURL: (queryParams) => {
                return {
                    categories: queryParams.get('categories')
                }
            }
        }
    });

    /**
     * Bloco para pegar o indice de categoria e depois pegar a variavele atribuir o valor
     * e chamar no filter
    **/
    const indexColumnCategories = columns.findIndex(c => c.name === 'categories');
    const columnCategories = columns[indexColumnCategories];
    const categoriesFilterValue = filterState.extraFilter && filterState.extraFilter.categories;
    (columnCategories.options as any).filterList = categoriesFilterValue ? categoriesFilterValue : [];


    useEffect(() => {
        let isSubscribed = true;
        (async () =>{
            try{
                const {data} = await categoryHttp.list({queryParam: {all: ''}});
                if(isSubscribed){
                    (columnCategories.options as any).filterOptions.names = data.data.map(category => category.name)
                }
            }catch (error){
                console.error(error);
                snackbar.enqueueSnackbar(
                    'Não foi possível carregar as informações',
                    {variant: 'error',}
                )
            }

        })();
        return () => {
            isSubscribed = false;
        }
    },[]);

    useEffect(() => {
        let isSubscribed = true;
        (async () =>{
            const {data} = await genreHttp.list();
            if(isSubscribed){
                setData(data.data)
            }
        })();
        return () => {
            isSubscribed = false;
        }
    },[]);

    useEffect(() => {
        subscribed.current = true;
        filterManager.pushHistory();
        getData();
        return () => {
            subscribed.current = false;
        }
    }, [
        filterManager.clearSearchText(debouncedFilterState.search),
        debouncedFilterState.pagination.page,
        debouncedFilterState.pagination.per_page,
        debouncedFilterState.order,
        JSON.stringify(debouncedFilterState.extraFilter)
    ]);

    async function getData() {
        setLoading(true);
        try {
            const {data} = await genreHttp.list<ListResponse<Genre>>({
                queryParam: {
                    search: filterManager.clearSearchText(debouncedFilterState.search),
                    page: debouncedFilterState.pagination.page,
                    per_page: debouncedFilterState.pagination.per_page,
                    sort: debouncedFilterState.order.sort,
                    dir: debouncedFilterState.order.dir,
                    ...(
                        debouncedFilterState.extraFilter &&
                        debouncedFilterState.extraFilter.categories &&
                        {categories: debouncedFilterState.extraFilter.categories.join(',')}
                    )
                }
            });
            if (subscribed.current) {
                setData(data.data);
                setTotalRecords(data.meta.total);
            }
        } catch (error) {
            console.error(error);
            if (genreHttp.isCancelledRequest(error)) {
                return;
            }
            snackbar.enqueueSnackbar(
                'Não foi possível carregar as informações',
                {variant: 'error',}
            )
        } finally {
            setLoading(false);
        }
    }




    return (
        <MuiThemeProvider theme={makeActionStyles(columnsDefinition.length - 1)}>
            <DefaultTable
                columns={columnsDefinition}
                data={data}
                title={'Listagem de Gêneros'}
                loading={loading}
                debouncedSearchTime={debouncedSearchTime}
                options={{
                    serverSide: true,
                    searchText: filterState.search as any,
                    page: filterState.pagination.page - 1,
                    rowsPerPage: filterState.pagination.per_page,
                    rowsPerPageOptions,
                    count: totalRecords,
                    onFilterChange: (column, filterList, type) => {
                        const columnIndex = columns.findIndex(c => c.name === column);
                        filterManager.changeExtraFilter({
                            [column as any]: filterList[columnIndex].length ? filterList[columnIndex] : null
                        })
                    },
                    customToolbar: () => (
                        <FilterResetButton handleClick={() => {
                            filterManager.resetFilter();
                        }}/>
                    ),
                    onSearchChange: (value) => filterManager.changeSearch(value),
                    onChangePage: (page) => filterManager.changePage(page),
                    onChangeRowsPerPage: (perPage) => filterManager.changeRowsPerPage(perPage),
                    onColumnSortChange: (changedColumn: string, direction: string) =>
                        filterManager.changeColumnSort(changedColumn, direction)
                }}
            />
        </MuiThemeProvider>

    );
};

export default Table;