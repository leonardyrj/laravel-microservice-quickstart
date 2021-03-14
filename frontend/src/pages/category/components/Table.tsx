import React, {useEffect, useReducer, useRef, useState} from 'react';
import format from "date-fns/format"
import parseISO from "date-fns/parseISO"
import categoryHttp from "../../../util/http/category-http";
import {BadgeYes,BadgeNo} from '../../../components/Badge'
import {Category, ListResponse} from "../../../util/models";
import DefaultTable, {makeActionStyles, TableColumn} from '../../../components/Table'
import {useSnackbar} from "notistack";
import {IconButton, MuiThemeProvider} from "@material-ui/core";
import {Edit} from "@material-ui/icons";
import {Link} from "react-router-dom";
import FilterResetButton from "../../../components/Table/FilterResetButton";
import useFilter from "../../../hooks/useFilter";
import {Creators} from '../../../store/filter/index'

const columnsDefinition: TableColumn[] = [
    {
        name: "id",
        label: "Id",
        width: "33%",
        options:{
            sort: false,
            filter: false
        }
    },
    {
        name: "name",
        label: "Nome",
        width: "40%"
    },
    {
        name: "is_active",
        label: "Ativo?",
        options: {
            customBodyRender(value, tableMeta, updateValue ){
                return value ? <BadgeYes/> : <BadgeNo/>
            },
            filterOptions: {
                names: ['Sim','Não']
            },
        },
        width: '4%'
    },
    {
        name: "created_at",
        label: "Criado em",
        width: '10%',
        options: {
            customBodyRender(value, tableMeta, updateValue ){
                return <span>{format(parseISO(value),'dd/MM/yyyy')}</span>
            },
            filter: false
        }
    },
    {
        name: "actions",
        label: "Ações",
        width: '13%',
        options: {
            customBodyRender(value, tableMeta, updateValue): JSX.Element {
                return(
                    <IconButton
                        color={'secondary'}
                        component={Link}
                        to={`/categorias/${tableMeta.rowData[0]}/edit`}
                    >
                        <Edit/>
                    </IconButton>
                )
            },
            filter: false
        }

    }
];

const debounceTime = 200;
const debouncedSearchTime = 300;
const rowsPerPage = 10;
const rowsPerPageOptions =  [10,25,50];

const Table = () => {
    const snackbar = useSnackbar();
    const subscribed = useRef(true);
    const [data,setData] = useState<Category[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
     const {
         debouncedFilterState,
         filterManager,
         filterState,
         dispatch,
         totalRecords,
         setTotalRecords
     } = useFilter({
         columns: columnsDefinition,
         debounceTime: debounceTime,
         rowsPerPage,
         rowsPerPageOptions
     });


    useEffect(() => {
        subscribed.current = true;
        filterManager.pushHistory();
        getData();
        return () => {
            subscribed.current = false;
        }
    },[
        filterManager.clearSearchText(debouncedFilterState.search),
        debouncedFilterState.pagination.page,
        debouncedFilterState.pagination.per_page,
        debouncedFilterState.order
    ]);


    async function getData(){
        setLoading(true);
        try {
            const {data} = await categoryHttp.list<ListResponse<Category>>({
                queryParam: {
                    search: filterManager.clearSearchText(filterState.search),
                    page: filterState.pagination.page,
                    per_page: filterState.pagination.per_page,
                    sort: filterState.order.sort,
                    dir: filterState.order.dir
                }
            });
            if(subscribed.current){
                setData(data.data)
                setTotalRecords(data.meta.total)
            }
            }catch (error){
                console.error(error);
                if(categoryHttp.isCancelledRequest(error)){
                    return;
                }
                snackbar.enqueueSnackbar(
                    'Não foi possível carregar as informações',
                    {variant: 'error'}
                )
            }finally {
                setLoading(false)
            }
        }



        return (
        <MuiThemeProvider theme={makeActionStyles(columnsDefinition.length - 1)}>
            <DefaultTable
                columns={columnsDefinition}
                data={data}
                title={'Listagem de Categorias'}
                loading={loading}
                debouncedSearchTime={debouncedSearchTime}
                options={{
                    serverSide: true,
                    searchText: filterState.search as any,
                    page: filterState.pagination.page - 1,
                    rowsPerPage: filterState.pagination.per_page,
                    rowsPerPageOptions,
                    count: totalRecords,
                    customToolbar: () => (
                        <FilterResetButton handleClick={() => {
                          filterManager.resetFilter();
                            // dispatch(Creators.setReset())
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