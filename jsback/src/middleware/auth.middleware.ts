import jwt from 'jsonwebtoken';

export const authenticateToken = (req:any, res:any, next:any) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ message: 'Доступ запрещён. Токен отсутствует.' });
  }

  jwt.verify(token, 'secret_key', (err:any, user:any) => {
    if (err) {
      return res.status(403).json({ message: 'Неверный токен.' });
    }

    req.user = user;
    next();
  });
};
