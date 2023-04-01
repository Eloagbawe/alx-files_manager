import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';

import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    let token;
    const usersCollection = dbClient.db.collection('users');
    if (req.headers.authorization && req.headers.authorization.startsWith('Basic')) {
      // eslint-disable-next-line prefer-destructuring
      token = req.headers.authorization.split(' ')[1];
      const decodedToken = Buffer.from(token, 'base64').toString('ascii');
      const [email, password] = decodedToken.split(':');
      const user = await usersCollection.findOne({ email, password: sha1(password) });
      if (user) {
        const newToken = uuidv4();
        const key = `auth_${newToken}`;
        await redisClient.set(key, user._id.toString(), 60 * 60 * 24);
        res.status(200).json({ token: newToken });
      } else {
        res.status(400).json({ error: 'Unauthorized' });
      }
    }
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    const id = await redisClient.get(`auth_${token}`);

    if (id) {
      await redisClient.del(`auth_${token}`);
      res.status(204).send();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  }
}

export default AuthController;
