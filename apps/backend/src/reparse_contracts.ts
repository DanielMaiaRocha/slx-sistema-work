import { connectDB } from './config/db';
import { User, DocumentModel } from './models';
import { ParserService } from './services/parser.service';

async function run() {
  await connectDB();

  const user: any = await User.findOne({ cpf: '20993460704' }).lean();
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }

  const contracts: any[] = await DocumentModel.find({
    userId: user._id,
    type: { $regex: '^CONTRACT' },
  }).lean();

  console.log(`Found ${contracts.length} contracts to re-parse.`);

  for (const doc of contracts) {
    console.log(`Processing: ${doc.name} (${doc.url})`);
    try {
      const metadata: any = await ParserService.parseContract(doc.url);
      console.log('Extracted Metadata:', metadata);

      await DocumentModel.findByIdAndUpdate(doc._id, {
        amount: metadata.amount || null,
        address: metadata.address || null,
        duration: metadata.duration || null,
      });
      console.log('✅ Updated DB');
    } catch (err) {
      console.error(`❌ Error parsing ${doc.name}:`, err);
    }
  }

  process.exit(0);
}

run();
