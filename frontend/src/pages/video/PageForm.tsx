import * as React from 'react';
import {Page} from "../../components/Page";
import {useParams} from 'react-router';
import {Form} from "./components/Form";

const PageForm = () => {
    const {id} = useParams<{id: string}>();
    return (
        <Page title={!id ? 'Criar vídeo' : 'Editar vídeo'}>
            <Form/>
        </Page>
    );
};

export default PageForm;
