'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function addCommitment(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('You must be logged in to add a commitment.');
    }

    const title = formData.get('title') as string;
    // Convert the HTML datetime-local string into a proper JavaScript Date object
    const startTime = new Date(formData.get('startTime') as string);
    const endTime = new Date(formData.get('endTime') as string);

    await prisma.fixedCommitment.create({
        data: {
            title,
            startTime,
            endTime,
            userId: session.user.id,
        },
    });

    revalidatePath('/');
}

export async function deleteCommitment(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Unauthorised');
    }

    const commitmentId = formData.get('commitmentId') as string;

    await prisma.fixedCommitment.deleteMany({
        where: {
            id: commitmentId,
            userId: session.user.id, // Strict data isolation
        },
    });

    revalidatePath('/');
}