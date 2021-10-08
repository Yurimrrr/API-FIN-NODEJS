const { response } = require('express');
const express = require ('express');
const {v4: uuidv4} = require('uuid');

const app = express();

app.use(express.json());

const usuarios = [];

//Middleware
function verificacaoUsuarioCpf(req, res, next){

    const {cpf} = req.headers;

    const usuario = usuarios.find((usuario) => usuario.cpf === cpf);

    if(!usuario){
        return res.status(400).json({error: "Usuario nao encontrado!"});
    }

    req.usuario = usuario;

    return next();

}

function getBalanco(extrato){
    const balanco = extrato.reduce((acc, operacao) => {
        if(operacao.tipo == "credit"){
            return acc + operacao.valor;
        }else{
            return acc - operacao.valor
        }
    }, 0);

    return balanco
}

app.post("/account", (req, res) =>{
    const { cpf, name } = req.body;
    const usuarioJaExistente = usuarios.some(
        (usuario) => usuario.cpf === cpf
    );
    if(usuarioJaExistente){
        return res.status(400).json({error: "CPF ja cadastrado!"});
    }
    usuarios.push({
        cpf,
        name,
        id: uuidv4(),
        extrato: []
    });

    return res.status(201).send();

});

app.get("/extrato/", verificacaoUsuarioCpf, (req, res) =>{

    const {usuario} = req;

    return res.json(usuario.extrato);
});

app.post("/deposito", verificacaoUsuarioCpf, (req, res) => {
    const { descricao, valor} = req.body;

    const {usuario} = req;

    const operacao = {
        descricao,
        valor,
        criado_em: new Date(),
        tipo: "credit"
    }

    usuario.extrato.push(operacao);

    return res.status(201).send();
});

app.post("/saque", verificacaoUsuarioCpf, (req, res) => {
    const {valor} = req.body;
    const {usuario} = req;

    const balanco = getBalanco(usuario.extrato);

    if(balanco < valor){
        return res.status(400).json({error: "Fundos insuficientes para fazer o saque!"})
    }

    const operacao = {
        valor,
        criado_em: new Date(),
        tipo: "debit"
    };

    usuario.extrato.push(operacao);
   
    return res.status(201).send();
});

app.get("/extrato/date", verificacaoUsuarioCpf, (req, res) =>{
    const {usuario} = req;
    const {date} = req.query;

    const dateFormat = new Date(date + " 00:00");

    const extrato = usuario.extrato.filter(
        (extrato) => 
        extrato.criado_em.toDateString() === new Date(dateFormat).toDateString()
        );
    return res.json(extrato);
});

app.put("/account", verificacaoUsuarioCpf,(req, res)=>{
    const {name} = req.body;
    const {usuario} = req;

    usuario.name = name;

    return res.status(201).send();
});

app.get("/account", verificacaoUsuarioCpf, (req, res) => {
    const {usuario} = req;

    return res.json(usuario);
})

app.delete("/account", verificacaoUsuarioCpf, (req, res) =>{
    const {usuario} = req;

    usuarios.splice(usuario, 1);

    return res.status(200).json(usuarios);
})

app.get("/balanco", verificacaoUsuarioCpf, (req, res)=>{
    const {usuario} = req;
    const balanco = getBalanco(usuario.extrato)

    return res.json(balanco)
})



app.listen(3333); 
