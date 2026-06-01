using BaseCore.Common;
using BaseCore.Entities;
using BaseCore.Repository.Authen;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services.Authen
{
    public interface IUserService
    {
        Task<User> Authenticate(string username, string password);
        Task<List<User>> GetAll();
        Task<User> GetById(string id);
        Task<User> Create(User user, string password);
        Task Update(User user, string password = null);
        Task Delete(string id);
        Task<(List<User> Users, int TotalCount)> Search(string keyword, int page, int pageSize);
    }

    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<User> Authenticate(string username, string password)
        {
            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
                return null;

            var user = await _userRepository.GetByUsernameAsync(username);

            // check if username exists
            if (user == null)
                return null;

            // verify password using hash or plain text
            bool isValidPassword = false;

            if (user.Salt != null && user.Salt.Length > 0)
            {
                // Hashed password
                isValidPassword = TokenHelper.IsValidPassword(password, user.Salt, user.Password);
            }
            else
            {
                // Plain text password (for seeded/legacy users)
                isValidPassword = (user.Password == password);
            }

            if (!isValidPassword)
            {
                Console.WriteLine($"Password verification failed for user: {username}");
                return null;
            }

            Console.WriteLine($"User authenticated successfully: {username}");

            // authentication successful
            return user;
        }

        public async Task<List<User>> GetAll()
        {
            return await _userRepository.GetAllAsync();
        }

        public async Task<User> GetById(string id)
        {
            return await _userRepository.GetByIdAsync(id);
        }

        public async Task<User> Create(User user, string password)
        {
            if (user == null)
            {
                throw new ArgumentNullException(nameof(user));
            }

            user.UserName = user.UserName?.Trim();
            user.Name = user.Name?.Trim();
            user.Email = user.Email?.Trim();
            user.Phone = user.Phone?.Trim();
            user.Address = user.Address?.Trim();

            if (string.IsNullOrWhiteSpace(user.UserName))
            {
                throw new InvalidOperationException("Tên đăng nhập là bắt buộc.");
            }

            if (string.IsNullOrWhiteSpace(password))
            {
                throw new InvalidOperationException("Mật khẩu là bắt buộc.");
            }

            var existingUser = await _userRepository.GetByUsernameAsync(user.UserName);
            if (existingUser != null)
            {
                throw new InvalidOperationException("Tên đăng nhập đã tồn tại.");
            }

            user.Id ??= Guid.NewGuid().ToString("N");
            user.Name ??= user.UserName ?? "";
            user.Contact ??= "";
            user.Email ??= "";
            user.Phone ??= "";
            user.Address ??= "";
            user.Position ??= "";
            user.Image ??= "";
            // Hash password with salt
            byte[] salt;
            user.Password = TokenHelper.HashPassword(password, out salt);
            user.Salt = salt;
            user.Created = DateTime.Now;
            user.IsActive = true;

            await _userRepository.CreateAsync(user);
            return user;
        }

        public async Task Update(User user, string password = null)
        {
            user.Address = user.Address?.Trim();
            user.Name ??= user.UserName ?? "";
            user.Contact ??= "";
            user.Email ??= "";
            user.Phone ??= "";
            user.Address ??= "";
            user.Position ??= "";
            user.Image ??= "";
            if (!string.IsNullOrEmpty(password))
            {
                byte[] salt;
                user.Password = TokenHelper.HashPassword(password, out salt);
                user.Salt = salt;
            }
            await _userRepository.UpdateAsync(user);
        }

        public async Task Delete(string id)
        {
            await _userRepository.DeleteAsync(id);
        }

        public async Task<(List<User> Users, int TotalCount)> Search(string keyword, int page, int pageSize)
        {
            return await _userRepository.SearchAsync(keyword, page, pageSize);
        }
    }
}
