import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { IpAddress } from './schemas/ip-address.schema';
import { CreateIpAddressDto } from './dto/create-ip-address.dto';
import { UpdateIpAddressDto } from './dto/update-ip-addressdto';
import { QueryIpAddressDto } from './dto/query-ip-address.dto';
import { DbService } from 'src/db/db.service';

@Injectable()
export class IpAddressService {
  constructor(
    private readonly model: DbService,
  ) { }

  async create(createIpAddressDto: CreateIpAddressDto) {
    try {
      const { name, address, created_by } = createIpAddressDto;

      // Normalize name and address
      const normalizedName = name?.trim();
      const normalizedAddress = address?.trim();

      // Check if the IP address or name already exists
      const isExisting = await this.model.ipaddress.findOne({
        $or: [
          { address: normalizedAddress }
        ]
      });

      if (isExisting) {
        throw new HttpException(
          {
            error_description: "This IP address is already registered in the system.",
          },
          HttpStatus.BAD_REQUEST
        );
      }

      // Create new IP address entry
      const data = await this.model.ipaddress.create({
        ...createIpAddressDto,
        name: normalizedName,
        address: normalizedAddress,
        date_entered: new Date(),
        created_by,
      });

      return { data };
    } catch (error) {
      throw error;
    }
  }

  async findAll(queryDto: QueryIpAddressDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        created_by,
        sortBy = 'date_entered',
        sortOrder = 'desc',
      } = queryDto;

      const skip = (page - 1) * limit;

      // Build search filter
      const filter: Record<string, any> = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } },
        ];
      }

      if (created_by) {
        filter.created_by = created_by;
      }

      // Sorting
      const sort: Record<string, 1 | -1> = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Fetch IP addresses with pagination
      const ipAddresses = await this.model.ipaddress
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort(sort);

      // Prepare response data (you can add more computed fields if needed)
      const data = await Promise.all(
        ipAddresses.map(async (ip) => {
          return { ...ip.toObject() };
        })
      );

      // Count total documents matching the filter
      const data_count = await this.model.ipaddress.countDocuments(filter);

      return { data_count, data };
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const data = await this.model.ipaddress.findOne({ _id: id });

      if (!data) {
        throw new NotFoundException(`IP Address with ID ${id} not found`);
      }

      return { data };
    } catch (error) {
      throw error;
    }
  }

  async update(
    id: string,
    updateIpAddressDto: UpdateIpAddressDto,
  ): Promise<IpAddress> {
    const updatedIpAddress = await this.model.ipaddress
      .findOneAndUpdate({ _id: id }, updateIpAddressDto, {
        new: true,
      })
      .exec();
    if (!updatedIpAddress) {
      throw new NotFoundException(`Ip Address with ID ${id} not found`);
    }
    return updatedIpAddress;
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.model.ipaddress.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Ip Address with ID ${id} not found`);
    }

    return { message: 'Ip Address deleted successfully' };
  }

  async removeMany(ids: string[]): Promise<{ deletedCount: number }> {
    try {
      const result = await this.model.ipaddress.deleteMany({
        _id: { $in: ids },
      });
      return { deletedCount: result.deletedCount };
    } catch (error) {
      throw error
    }
  }
}
