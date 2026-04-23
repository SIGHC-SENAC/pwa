
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.USER_GMAIL,   
    pass: process.env.PASSWORD_GMAIL
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Erro no transporter do Nodemailer:', error);
  } else {
    // console.log('Servidor de e-mail pronto para enviar mensagens');
  }
});


export  { transporter } ;