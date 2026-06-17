using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public class ManufacturerRepository : Repository<Manufacturer>, IManufacturerRepository
    {
        public ManufacturerRepository(MySqlDbContext context) : base(context)
        {
        }
    }
}
