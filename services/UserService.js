import db from '../dist/db/models/index.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

const createUser = async (req) => {
    const {
        name,
        email,
        password,
        password_second,
        cellphone
    } = req.body;
    if (password !== password_second) {
        return {
            code: 400,
            message: 'Passwords do not match'
        };
    }
    const user = await db.User.findOne({
        where: {
            email: email
        }
    });
    if (user) {
        return {
            code: 400,
            message: 'User already exists'
        };
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.User.create({
        name,
        email,
        password: encryptedPassword,
        cellphone,
        status: true
    });
    return {
        code: 200,
        message: 'User created successfully with ID: ' + newUser.id,
    }
};

const getUserById = async (id) => {
    return {
        code: 200,
        message: await db.User.findOne({
            where: {
                id: id,
                status: true,
            }
        })
    };
}

const updateUser = async (req) => {
    const user = db.User.findOne({
        where: {
            id: req.params.id,
            status: true,
        }
    });
    const payload = {};
    payload.name = req.body.name ?? user.name;
    payload.password = req.body.password ? await bcrypt.hash(req.body.password, 10) : user.password;
    payload.cellphone = req.body.cellphone ?? user.cellphone;
    await db.User.update(payload, {
        where: {
            id: req.params.id
        }

    });
    return {
        code: 200,
        message: 'User updated successfully'
    };
}

const deleteUser = async (id) => {
    /* await db.User.destroy({
        where: {
            id: id
        }
    }); */
    const user = db.User.findOne({
        where: {
            id: id,
            status: true,
        }
    });
    await  db.User.update({
        status: false
    }, {
        where: {
            id: id
        }
    });
    return {
        code: 200,
        message: 'User deleted successfully'
    };
}

const getAllUsers = async () => {

    const user = await db.User.findAll({
        where: {
            status: true,
        }
    });

    return {
        code: 200,
        message: user,
    };
}

const findUsers = async (req, res) => {
    console.log('Params received:', req.query);

    const { status, name, login_before_date, login_after_date } = req.query;
    const whereClause = {};

    if (status !== undefined) {
        whereClause.status = status === 'true';
    }
    if (name) {
        whereClause.name = {
            [Op.like]: `%${name}%`
        };
    }
    
    if (login_before_date && login_after_date) {
        const startDate = new Date(login_after_date);  
        const endDate = new Date(login_before_date); 
        whereClause.updatedAt = {
            [Op.between]: [startDate, endDate]
        };
    } else if (login_before_date) {
        whereClause.updatedAt = {
            [Op.lte]: new Date(login_before_date)
        };
    } else if (login_after_date) {
        whereClause.updatedAt = {
            [Op.gte]: new Date(login_after_date)
        };
    }

    console.log('Where clause:', whereClause);

    const users = await db.User.findAll({
        where: whereClause
    });

    console.log('Users found:', users);
    return {
        code: 200,
        message: users,
    };
};

const validateUser = (user) => {
    return user.name && user.email && user.password && user.password === user.password_second;
};

const bulkCreate = async (req, res) => {
    const usersToCreate = req.body;

    if (!Array.isArray(usersToCreate)) {
        return res.status(400).json({
            code: 400,
            message: 'Invalid request format: Expected an array of users.'
        });
    }

    let createdUserCount = 0;
    let failedUserCount = 0;
    const failedUsers = [];

    for (const user of usersToCreate) {
        try {
            const result = await createUser({
                body: {
                    name: user.name,
                    email: user.email,
                    password: user.password,
                    password_second: user.password_second,
                    cellphone: user.cellphone
                }
            });

            if (result.code === 200) {
                createdUserCount++;
            } else {
                failedUserCount++;
                failedUsers.push({ email: user.email, reason: result.message });
            }
        } catch (error) {
            console.error(`Error creating user ${user.email}:`, error);
            failedUserCount++;
            failedUsers.push({ email: user.email, reason: 'Internal server error' });
        }
    }

    return res.status(200).json({
        code: 200,
        message: `Proceso de creación de usuarios terminado`,
        createdUserCount,
        failedUserCount
    });
};


export default {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    getAllUsers,
    findUsers,
    bulkCreate,

}