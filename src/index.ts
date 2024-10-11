import express, {Request, Response} from "express";
import mysql from "mysql2/promise";
import { RowDataPacket } from 'mysql2';


const app = express();

// Configura EJS como a engine de renderização de templates
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);

const connection = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "root",
    database: "CourseStudentRegistry"
});

// Middleware para permitir dados no formato JSON
app.use(express.json());
// Middleware para permitir dados no formato URLENCODED
app.use(express.urlencoded({ extended: true }));


// gets

// get do Curso
app.get('/users', async function (req: Request, res: Response) {
    const [rows] = await connection.query("SELECT * FROM Courses");
    return res.render('users/login', {
        users: rows
    });
});


app.get("/users/formlogin", async function (req: Request, res: Response) {
    return res.render("users/formLogin");
});

app.get("/users/login", async function(req:Request, res: Response) {
    return res.render("users/index");
})

app.get("/users/edit/:course_id", async function (req: Request, res: Response) {
    const id = req.params.course_id;
    
        const [check] = await connection.query(
            "SELECT * FROM Courses WHERE course_id = ?",
            [id]
        );

        if (!check) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        res.render("users/formEdit", { user: check[0]});
    
});

app.get('/users/list', async function (req: Request, res: Response) {
    const [rows] = await connection.query("SELECT * FROM Courses");
    return res.render('users/index', {Courses: rows});
});

// gets do Aluno

app.get('/users', async function (req: Request, res: Response) {
    const [rows] = await connection.query("SELECT * FROM Students");
    return res.render('users/login', {
        users: rows
    });
});

app.get('/users/listAlunos', async function (req: Request, res: Response) {
    const [rows] = await connection.query("SELECT * FROM Students");
    return res.render('users/pagAlunos', {Students: rows});
});

app.get("/users/cadastrarAlunos", async function (req: Request, res: Response) {
    return res.render("users/cadastrarAlunos");
});

app.get("/users/editar/:student_id", async function (req: Request, res: Response) {
    const id = req.params.student_id;
    
        const [check] = await connection.query(
            "SELECT * FROM Students WHERE student_id = ?",
            [id]
        );

        if (!check) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        res.render("users/editarAluno", { user: check[0]});
    
});

app.get('/users/posts', async function (req: Request, res: Response) {
    return res.render("users/posts");
});

//Posts


app.post("/users/delete/:course_id", async function (req: Request, res: Response) {
    const id = req.params.course_id;

    // Verificar se há alunos inscritos no curso
    const [enrollments] = await connection.query<RowDataPacket[]>(
        "SELECT * FROM Enrollments WHERE course_id = ?",
        [id]
    );

    // Se houver inscrições, retornar uma mensagem de alerta
    if (enrollments.length > 0) {
        return res.status(400).send("<script>alert('Não é possível excluir o curso. Existem alunos inscritos.'); window.location.href='/users/list';</script>");
    }

    // Se não houver inscrições, excluir o curso
    const sqlDelete = "DELETE FROM Courses WHERE course_id = ?";
    await connection.query(sqlDelete, [id]);

    res.redirect("/users/list");
});


app.post("/users/login", async function (req: Request, res: Response){
    const {email,password} = req.body;

    try {
        // 1. Buscar o usuário pelo email e senha no banco de dados
        const [rows]: any = await connection.query(
            "SELECT * FROM users WHERE email = ? AND password = ?",
            [email, password]
        );

        // Verificar se encontrou o usuário (checando se `rows` contém resultados)
        if (rows.length === 0) {
            return res.status(400).json({ message: 'Usuário ou senha incorretos' });
        }

        // Se o usuário foi encontrado, redirecionar para a listagem de usuários
        res.redirect("/users/list");

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro no servidor' });
    }
});

app.post("/users/edit/:course_id", async function (req: Request, res: Response) {
    const id = req.params.course_id;  
    const body = req.body; 

    console.log(`ID do curso: ${id}`);
    console.log(`Dados recebidos:`, body);

        const sqlUpdate = "UPDATE Courses SET name = ?, description = ?, duration = ?, price = ? WHERE course_id = ?";
        await connection.query(sqlUpdate, [body.name, body.description, body.duration, body.price, id]);

        res.redirect("/users/list");
});

app.post("/users/savelogin", async function (req: Request, res: Response) {
    const { name, description, duration, price} = req.body;

    const insertQuery = "INSERT INTO Courses (name, description, duration, price) VALUES (?, ?, ?, ?)";
    try {
        await connection.query(insertQuery, [name, description, duration, price]);

        res.redirect("/users/list");

    } catch (err) {
        res.status(500).send("Erro ao salvar o usuário.");
    }
});

//POST DE alunos

app.post("/users/deletar/:student_id", async function (req: Request, res: Response) {
    const id = req.params.student_id;
    const sqlDelete = "DELETE FROM Students WHERE student_id = ?";
    await connection.query(sqlDelete, [id]);

    res.redirect("/users/listAlunos");
});

app.post("/users/editar/:student_id", async function (req: Request, res: Response) {
    const id = req.params.student_id; 
    const body = req.body; 

    console.log(`ID do aluno: ${id}`);
    console.log(`Dados recebidos:`, body);

        const sqlUpdate = "UPDATE Students SET name = ?, age = ?, email = ? WHERE student_id = ?";
        await connection.query(sqlUpdate, [body.name, body.age, body.email, id]);

        res.redirect("/users/listAlunos");
});

app.post("/users/savealuno", async function (req: Request, res: Response) {
    const { name, age, email} = req.body;

    const insertQuery = "INSERT INTO Students (name, age, email) VALUES (?, ?, ?)";
    try {
        await connection.query(insertQuery, [name, age, email]);

        res.redirect("/users/listAlunos");

    } catch (err) {
        res.status(500).send("Erro ao salvar o usuário.");
    }
});

// Listar os cursos de um aluno
app.get('/enrollments/:student_id', async function (req: Request, res: Response) {
    const student_id = req.params.student_id;

    // Obter informações do aluno
    const [student] = await connection.query<RowDataPacket[]>( 
        "SELECT * FROM Students WHERE student_id = ?", 
        [student_id]
    );

    // Obter os cursos que o aluno está inscrito, incluindo o ID do curso
    const [courses] = await connection.query<RowDataPacket[]>( 
        "SELECT C.course_id, C.name, C.duration FROM Courses C " +
        "JOIN Enrollments E ON C.course_id = E.course_id " +
        "WHERE E.student_id = ?", 
        [student_id]
    );

    // Verificar se o aluno foi encontrado
    if (student.length === 0) {
        return res.status(404).json({ message: "Aluno não encontrado" });
    }

    // Renderizar a página com os dados do aluno e dos cursos
    return res.render('users/cursosDoAluno', { student: student[0], courses });
});



// Página de inscrição de um novo curso para o aluno
app.get('/enroll/:student_id', async function (req: Request, res: Response) {
    const student_id = req.params.student_id;

    const [student] = await connection.query<RowDataPacket[]>(
        "SELECT * FROM Students WHERE student_id = ?", 
        [student_id]
    );
    const [availableCourses] = await connection.query<RowDataPacket[]>( 
        "SELECT * FROM Courses WHERE course_id NOT IN " + 
        "(SELECT course_id FROM Enrollments WHERE student_id = ?)", 
        [student_id]
    );

    if (student.length === 0) {
        return res.status(404).json({ message: "Aluno não encontrado" });
    }

    return res.render('users/inscreverEmCurso', { student: student[0], availableCourses });
});


// Confirmar a inscrição do aluno em um curso
app.post('/enroll/confirm', async function (req: Request, res: Response) {
    const { student_id, course_id } = req.body;

    try {
        const insertQuery = "INSERT INTO Enrollments (student_id, course_id) VALUES (?, ?)";
        await connection.query(insertQuery, [student_id, course_id]);

        res.redirect(`/enrollments/${student_id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao inscrever o aluno no curso.");
    }
});

// Cancelar a inscrição de um aluno em um curso
app.post("/enroll/cancel", async function (req: Request, res: Response) {
    const { student_id, course_id } = req.body;

    // Log para verificar se os IDs estão corretos
    console.log(`Cancelando inscrição do aluno ID: ${student_id} no curso ID: ${course_id}`);

    try {
        const deleteQuery = "DELETE FROM Enrollments WHERE student_id = ? AND course_id = ?";
        await connection.query(deleteQuery, [student_id, course_id]);

        // Redireciona para a lista de inscrições do aluno
        res.redirect(`/enrollments/${student_id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao cancelar a inscrição do aluno.");
    }
});


// Ver detalhes de um Curso
app.get('/users/course/:course_id', async function (req: Request, res: Response) {
    const courseId = req.params.course_id;

    // Obter informações do curso
    const [course] = await connection.query<RowDataPacket[]>( 
        "SELECT * FROM Courses WHERE course_id = ?", 
        [courseId]
    );

    // Obter os alunos inscritos nesse curso
    const [students] = await connection.query<RowDataPacket[]>( 
        "SELECT S.student_id, S.name, S.email FROM Students S " +  // Adicione o student_id aqui
        "JOIN Enrollments E ON S.student_id = E.student_id " +
        "WHERE E.course_id = ?", 
        [courseId]
    );

    // Verificar se o curso foi encontrado
    if (course.length === 0) {
        return res.status(404).json({ message: "Curso não encontrado" });
    }

    // Renderizar a página com os dados do curso e dos alunos
    return res.render('users/detalhesCurso', { course: course[0], students });
});



app.listen('3000', () => console.log("Server is listening on port 3000"));